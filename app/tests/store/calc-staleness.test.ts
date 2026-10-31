import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { dismissCalcBanner, getCalcBanner } from '@/controllers/calcStaleness';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { setInput } from '@/controllers/inputs';
import { openCaseText } from '@/controllers/openFile';
import type { buildCalcPackage } from '@/domain/calcPackage';
import { checkStaleness } from '@/domain/calcStaleness';
import { makeDefaultDoc } from '@/store/instance';
import { fromSnapshot, toSnapshot } from '@/store/persistence/snapshot';
import { freshStore, snap, type Saved } from './helpers';

const pkgOf = (json: string) => (JSON.parse(json) as Saved).calculationPackage;
const file = (obj: unknown) => ({ text: async () => JSON.stringify(obj) });
afterEach(() => dismissCalcBanner());

describe('calculation package', () => {
  it('is stamped into every snapshot with hash, version and key figures, and is not part of the document', () => {
    const doc = makeDefaultDoc(), s = toSnapshot(doc), p = s.calculationPackage as ReturnType<typeof buildCalcPackage>;
    expect(p.calculationVersion).toBe('agentcase.timeengine.v2');   // v2 since BPMN B9b (the B9b deviations)
    expect(p.inputHash).toMatch(/^te1:/);
    expect(p.annual).toHaveLength(Number(doc.dom.values.horizon));
    expect(Number.isFinite(p.headline.npv)).toBe(true);
    expect(fromSnapshot(JSON.parse(JSON.stringify(s)))).not.toHaveProperty('calculationPackage');
    expect(JSON.stringify(fromSnapshot(JSON.parse(JSON.stringify(s))))).toBe(JSON.stringify(doc));
  });
  it('round trip: saving and reopening a case is valid, silent, and keeps the figures recomputed', async () => {
    freshStore(); setAgentSup('A017', 100);
    const { json } = exportSnapshotJson(), s = freshStore(), before = snap(s);
    await importSnapshotFile({ text: async () => json });
    expect(getCalcBanner()).toBeNull();
    expect(snap(s)).not.toBe(before);
    expect(checkStaleness(JSON.parse(json).calculationPackage, s.getState().doc).state).toBe('valid');
  });
  it('JSON export carries the package through the controller', () => {
    freshStore();
    expect(pkgOf(exportSnapshotJson().json).inputHash).toMatch(/^te1:/);
  });
});

describe('tamper and staleness detection', () => {
  const saved = () => { freshStore(); setInput('horizon', '4'); return JSON.parse(exportSnapshotJson().json) as Saved; };

  it('edited inputs (hash differs) raise the banner state with saved and live headlines', async () => {
    const f = saved(); f.dom.values.horizon = '5';
    freshStore(); await importSnapshotFile(file(f));
    const b = getCalcBanner();
    expect(b?.state).toBe('stale');
    expect(b?.storedHeadline).toBeDefined();
    expect(b?.liveHeadline?.npv).not.toBe(b?.storedHeadline?.npv);
  });
  it('same hash but altered figures is stale', async () => {
    const f = saved(); f.calculationPackage.headline.npv *= 1.5;
    freshStore(); await importSnapshotFile(file(f));
    expect(getCalcBanner()?.state).toBe('stale');
  });
  it('an altered annual row is stale', async () => {
    const f = saved(); f.calculationPackage.annual[0]!.savings += 1000;
    freshStore(); await importSnapshotFile(file(f));
    expect(getCalcBanner()?.state).toBe('stale');
  });
  it('a different calculationVersion is a version mismatch', async () => {
    const f = saved(); f.calculationPackage.calculationVersion = 'agentcase.timeengine.v0';
    freshStore(); await importSnapshotFile(file(f));
    expect(getCalcBanner()?.state).toBe('versionMismatch');
  });
  it('a malformed package is stale, never a crash', async () => {
    const f = saved(); (f as { calculationPackage: unknown }).calculationPackage = { inputHash: 7 };
    freshStore(); await importSnapshotFile(file(f));
    expect(getCalcBanner()?.state).toBe('stale');
  });
  it('the figures are never taken from the file: tampered numbers do not reach the case', async () => {
    const f = saved(); f.calculationPackage.headline.npv = 1e12;
    const s = freshStore(); await importSnapshotFile(file(f));
    expect(JSON.stringify(s.getState().doc)).not.toContain('1000000000000');
    expect(s.getState().doc).not.toHaveProperty('calculationPackage');
  });
  it('opening a clean file afterwards clears the banner', async () => {
    const f = saved(); f.calculationPackage.headline.npv *= 2;
    freshStore(); await importSnapshotFile(file(f));
    expect(getCalcBanner()).not.toBeNull();
    await importSnapshotFile(file(saved()));
    expect(getCalcBanner()).toBeNull();
  });
  it('the banner state is not in the document or the history: open, undo and redo leave it alone', async () => {
    const f = saved(); f.calculationPackage.headline.npv *= 2;
    const s = freshStore(); await importSnapshotFile(file(f));
    const banner = getCalcBanner(), steps = s.getState().history.undo.length;
    expect(JSON.stringify(s.getState().doc)).not.toMatch(/versionMismatch|storedHeadline/);
    s.undo(); s.redo();
    expect(getCalcBanner()).toBe(banner);
    expect(s.getState().history.undo.length).toBe(steps);
    dismissCalcBanner();
    expect(s.getState().history.undo.length).toBe(steps);
  });
});

describe('legacy-saved files', () => {
  it('a file without a package (fixtures predating v18.5) opens silently', () => {
    const s = freshStore(), raw = JSON.parse(readFileSync('fixtures/cases/golden.json', 'utf8'));
    expect(raw.calculationPackage).toBeUndefined();
    openCaseText(JSON.stringify(raw));
    expect(getCalcBanner()).toBeNull();
    expect(s.getState().history.undo).toHaveLength(1);
  });
  // BPMN B9b (the B9b deviations): the same inputs give other figures, so the engine is v2 and a package written by v1 (the legacy engine) is another version's
  it('a legacy v18.x snapshot carrying its own package is verified against the recomputed figures: another engine version since B9b', () => {
    freshStore();
    const text = readFileSync('fixtures/snapshots/golden.html', 'utf8');
    openCaseText(text);
    const b = getCalcBanner();
    expect([b?.state, b?.storedVersion, b?.liveVersion]).toEqual(['versionMismatch', 'agentcase.timeengine.v1', 'agentcase.timeengine.v2']);
  });
  it('the same legacy file with tampered figures shows the banner', () => {
    freshStore();
    const raw = JSON.parse(readFileSync('fixtures/snapshots/golden.json', 'utf8'));
    raw.calculationPackage.headline.npv += 50_000;
    raw.calculationPackage.calculationVersion = 'agentcase.timeengine.v2';   // as if this engine had written it (B9b: v2)
    openCaseText(JSON.stringify(raw));
    expect(getCalcBanner()?.state).toBe('stale');
  });
});
