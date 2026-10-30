import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { htmlSnapshotFile } from '@/controllers/htmlSnapshot';
import { addOrgUnit, setActivityRaci } from '@/controllers/org';
import { setInput } from '@/controllers/inputs';
import { derivedTeams, orgOf, readRaci, readStoredOrg } from '@/domain/org';
import { serialize } from '@/domain/process';
import { createAppStore, type AppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { memoryStorage, restoreRecord, startAutosave } from '@/store/persistence/autosave';
import { connectBroadcast } from '@/store/persistence/broadcast';
import { readEmbeddedCase } from '@/store/persistence/html/read';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { channelBus } from '../helpers/channels';
import { ENV } from '../helpers/excelParams';
import { sharedSetup } from '../helpers/sharedTeamStore';
import { freshStore } from './helpers';

/**
 * Phase B6b: the organisation (units, RACI) lives in the case's BPMN document and travels with it through every persistence path — save / open
 * (single case and portfolio), autosave with its undo history, tab sync, the HTML snapshot, the parameters workbook (with its SharedTeam sheet,
 * the teams staying derived from the products and the shared lines).
 */
const VENDOR = { id: 'unit-1', name: 'Nearshore vendor', type: 'vendor' as const, parent: 'unit-delivery', location: 'Portugal' };
const RACI = { R: ['role-arch'], A: 'role-lead', C: ['role-qa'], I: ['role-po'] };
const edit = () => { expect(addOrgUnit(VENDOR)).toBe(true); expect(setActivityRaci('A017', RACI)).toBe(true); };
const bpmnOf = (s: AppStore) => s.getState().portfolio.common.BPMN;
const orgIn = (d: Parameters<typeof readStoredOrg>[0]) => ({ units: readStoredOrg(d).units, raci: readRaci(d).find((a) => a.id === 'A017') });
const lastPatch = (s: AppStore) => JSON.stringify(s.getState().history.undo.at(-1)?.patches ?? []);

describe('commands: node-level undo patches, never the document', () => {
  it('a unit and a RACI are small patches; undo restores the exact tree', () => {
    const s = freshStore(), before = serialize(bpmnOf(s));
    expect(addOrgUnit(VENDOR)).toBe(true);
    expect(lastPatch(s).length).toBeLessThan(3_000);
    expect(setActivityRaci('A017', RACI)).toBe(true);
    expect(lastPatch(s).length).toBeLessThan(6_000);
    expect(lastPatch(s)).not.toContain('"kind":"document"');
    expect(setActivityRaci('A017', { R: ['role-ghost'], C: [], I: [] })).toBe(false);   // refused: no undo step
    expect(s.getState().history.undo.map((h) => h.type)).toEqual(['org.addUnit', 'org.setRaci']);
    s.undo(); s.undo();
    expect(serialize(bpmnOf(s))).toBe(before);
  });
});

describe('persistence round trips', () => {
  it('save -> open (single case): same document, units and RACI', () => {
    const s = freshStore(); edit();
    const saved = JSON.parse(JSON.stringify(toPortfolioSnapshot(s.getState().portfolio, () => new Date(0)))) as Record<string, unknown>;
    expect(saved.BPMN).toContain('<ac:orgUnit id="unit-1"');
    const back = openChecked(saved).portfolio;
    expect(back.common.BPMN).toStrictEqual(bpmnOf(s));
    expect(orgIn(back.common.BPMN)).toStrictEqual(orgIn(bpmnOf(s)));
  });
  it('portfolio file with a shared line: document and derived teams identical after save -> open', () => {
    const t = sharedSetup(); edit();
    const pf = t.s.getState().portfolio, back = openChecked(JSON.parse(JSON.stringify(toPortfolioSnapshot(pf, () => new Date(0))))).portfolio;
    expect(serialize(back.common.BPMN)).toBe(serialize(pf.common.BPMN));
    expect(derivedTeams(back)).toStrictEqual(derivedTeams(pf));
  });
  it('autosave: the record restores the organisation and its undo history', async () => {
    const s = freshStore((): number => Date.now()), storage = memoryStorage(), a = startAutosave(s, storage, 'tab-1', { delayMs: 1 });
    edit();
    expect(await a.flush()).toBe(true);
    a.stop();
    const t = createAppStore(s.getState().doc);
    restoreRecord(t, (await storage.list())[0]!);
    expect(bpmnOf(t)).toStrictEqual(bpmnOf(s));
    t.undo(); s.undo();
    expect(serialize(bpmnOf(t))).toBe(serialize(bpmnOf(s)));
  });
  it('tab sync: the other tab receives the unit and the RACI as patches', () => {
    const bus = channelBus();
    const mk = (id: string) => { const x = createAppStore(makeDefaultDoc(), { now: () => 0 }); connectBroadcast(x, bus.end(), id); return x; };
    const A = mk('A'), B = mk('B');
    setAppStore(A); setInput('y1Ramp', 40); edit();
    expect(serialize(bpmnOf(B))).toBe(serialize(bpmnOf(A)));
  });
  it('HTML snapshot: the embedded case carries the organisation', () => {
    const s = freshStore(); edit();
    const page = new DOMParser().parseFromString('<!doctype html><html><head><title>A</title></head><body><div id="root"></div></body></html>', 'text/html');
    const back = readEmbeddedCase(new DOMParser().parseFromString(htmlSnapshotFile(page.documentElement, new Date(0)).html, 'text/html'))!;
    expect(orgIn(back.doc.BPMN)).toStrictEqual(orgIn(bpmnOf(s)));
  });
  it('parameters workbook (portfolio, SharedTeam sheet): the document keeps its organisation, the teams are identical', async () => {
    const t = sharedSetup(); edit();
    const before = t.s.getState().portfolio, b = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    await importParamsWorkbook({ name: 'pf.xlsx', size: b.byteLength, arrayBuffer: async () => b }, ENV);
    const after = t.s.getState().portfolio;
    expect(orgIn(after.common.BPMN)).toStrictEqual(orgIn(before.common.BPMN));
    expect(derivedTeams(after)).toStrictEqual(derivedTeams(before));
    expect(orgOf(after, after.common.BPMN).teams.filter((x) => x.shared)).toHaveLength(1);
  });
});

