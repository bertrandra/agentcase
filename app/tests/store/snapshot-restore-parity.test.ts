import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { importSnapshotFile } from '@/controllers/files';
import { openCaseText } from '@/controllers/openFile';
import { computeCase } from '@/domain';
import { FIXTURE_IDS, loadCase } from '../helpers/portfolio';
import { freshStore, snapAll } from './helpers';
vi.mock('@/domain/programme/profile', async (orig) => (await import('../helpers/legacyProgramme')).legacyProfileMock(orig));   // legacy parity, B9b

/**
 * The parallel run (tools/parallel-run.mjs) opens the 107 case files in the legacy file (applySnapshotState) and in the built app (File > Open…).
 * Before lot 4, 3 differed. Each is pinned here with its explanation (docs/DEVIATIONS.md DEV-SNAPSHOT-RESTORE):
 * - lifecycle-pos-0: ours was wrong. File > Open… skipped the re-fit of the automation potential that the legacy restore (applyScopeAuto) and our other
 *   open paths do; at lifecycle position 0 the scope gives 74 %, the stored value is 75 %. Fixed: every open path re-fits.
 * - curve-bass, curve-legacy: the legacy restore is wrong. Its `scurve` setter accepts only the logistic, gompertz and spline families, so a saved
 *   `bass` or `legacy` curve reopens on the default spline (the golden figures). Ours reopens the saved curve: the oracle figures of those fixtures.
 */
const expected =
  (id: string) => JSON.parse(readFileSync(`fixtures/expected/${id}.json`, 'utf8')) as { npv: number; payback: number | null; model: { eff: number } };
const LEGACY = readFileSync('../AgentCase_v18_13_EN.html', 'utf8');
async function viaFileMenu(id: string) {
  const s = freshStore();
  await importSnapshotFile({ text: async () => readFileSync(`fixtures/cases/${id}.json`, 'utf8') });
  return s;
}

describe('snapshot restore: the File menu opens a case like every other open path', () => {
  it('File > Open… and the snapshot panel give the same portfolio on all 107 case files', async () => {
    expect(FIXTURE_IDS.length).toBe(107);
    for (const id of FIXTURE_IDS) {
      const a = snapAll(await viaFileMenu(id)), s = freshStore();
      openCaseText(readFileSync(`fixtures/cases/${id}.json`, 'utf8'));
      expect(snapAll(s), id).toBe(a);
    }
  }, 60_000);   // 214 opens, each migrating the case into its process document (schema v3)
  it('lifecycle-pos-0: the potential is re-fitted to 74 % on open, the figures are the legacy restore figures', async () => {
    const doc = (await viaFileMenu('lifecycle-pos-0')).getState().doc, r = computeCase(doc);
    expect(loadCase('lifecycle-pos-0').dom.values.autoPotential).toBe('75');
    expect(doc.dom.values.autoPotential).toBe('74');
    expect(r.model.eff).toBeCloseTo(62.9, 12);
    // measured in the legacy file: applySnapshotState(fixtures/cases/lifecycle-pos-0.json) then npvCanonical() = 1212009.6152358602, eff 62.9, payback 9
    expect(r.npv).toBeCloseTo(1212009.6152358602, 6);
    expect(r.payback).toBe(9);
    // the oracle drives the legacy engine WITHOUT a re-fit (recipe `lifecyclePos=0`): the stored case keeps 75 % and its own figures
    const stored = computeCase(loadCase('lifecycle-pos-0')), e = expected('lifecycle-pos-0');
    expect(stored.model.eff).toBe(e.model.eff);
    expect(stored.npv).toBeCloseTo(e.npv, 6);
  });
  it.each(['curve-bass', 'curve-legacy'])('%s: the saved curve family is kept (the legacy restore drops it)', async (id) => {
    expect(LEGACY).toContain("if(v.family==='logistic' || v.family==='gompertz' || v.family==='spline'){");
    const doc = (await viaFileMenu(id)).getState().doc, r = computeCase(doc), e = expected(id), golden = expected('golden');
    expect(doc.scurve).toEqual(loadCase(id).scurve);
    expect(r.npv).toBeCloseTo(e.npv, 6);
    expect(r.payback).toBe(e.payback);
    expect(Math.abs(r.npv - golden.npv)).toBeGreaterThan(1000);
  });
});
