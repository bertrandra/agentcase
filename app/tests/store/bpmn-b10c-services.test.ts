import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { addOrgUnit, setActivityRaci } from '@/controllers/org';
import { setActiveProduct } from '@/controllers/product';
import { addServiceLine, setServiceRoles, setServiceSkills, setSharedLineSplit, setSharedLineUnit, setUnitService } from '@/controllers/services';
import { setSharedPins, setSharedShare, updateSharedLine } from '@/controllers/sharedTeam';
import { addTeamRow, updateTeamRow } from '@/controllers/team';
import { readStoredOrg } from '@/domain/org';
import { lineShares, resolveProduct, sharedLines, type Portfolio } from '@/domain/portfolio';
import { serialize } from '@/domain/process';
import type { AppStore } from '@/store/core';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { expectAutosaveRestores, expectTabSync } from '../helpers/docRoundTrips';
import { ENV } from '../helpers/excelParams';
import { pfNow } from '../helpers/portfolioFixtures';
import { serviceThree } from '../helpers/services';
import { expectUndoProperty, type TeamOp } from '../helpers/teamUndo';
import { freshStore } from './helpers';

/**
 * Phase B10c (docs/SPEC_BPMN.md § 21 F-B82): the service of a unit (`ac:orgUnit service skills roles`) and the unit and split rule of a shared line
 * (`ac:team unit split`) are node patches of the common document; undo / redo restore exactly; they survive every persistence path.
 */
type Op = TeamOp;
const pf = (s: AppStore) => s.getState().portfolio;
const lineAt = (s: AppStore, i: number): string | undefined => { const ls = sharedLines(pf(s)); return ls[i % Math.max(1, ls.length)]?.id; };
const prod = (s: AppStore, i: number): string => pf(s).products[i % pf(s).products.length]!.id;
const ix = fc.nat(5);
const OPS: fc.Arbitrary<Op>[] = [
  fc.boolean().map((on): Op => () => { setUnitService('qa', on); }),
  ix.map((i): Op => () => { setServiceSkills('qa', [['Test/QA'], ['Dev'], [], ['Test/QA', 'Dev']][i % 4]!); }),
  ix.map((i): Op => () => { setServiceRoles('qa', i % 2 ? ['role-qa'] : []); }),
  ix.map((): Op => () => { addServiceLine('qa', 'Dev'); }),
  ix.map((i): Op => (s) => { const l = lineAt(s, i); if (l) setSharedLineUnit(l, i % 3 ? 'qa' : null); }),
  ix.map((i): Op => (s) => { const l = lineAt(s, i); if (l) setSharedLineSplit(l, i % 2 ? 'effort' : 'fixed'); }),
  fc.record({ i: ix, p: fc.integer({ min: 0, max: 100 }) }).map(({ i, p }): Op => (s) => { const l = lineAt(s, i); if (l) setSharedShare(l, prod(s, i), p); }),
  fc.record({ i: ix, v: fc.integer({ min: 0, max: 5 }) }).map(({ i, v }): Op => (s) => { const l = lineAt(s, i); if (l) updateSharedLine(l, 'etp', v); }),
  ix.map((i): Op => (s) => { const l = lineAt(s, i); if (l) setSharedPins(l, ['A017'], i % 2 === 0); }),
  fc.record({ etp: fc.integer({ min: 0, max: 9 }) }).map(({ etp }): Op => () => { addTeamRow({ etp }); }),
  ix.map((i): Op => (s) => { setActiveProduct(prod(s, i)); }),
];

describe('undo / redo after every service command (property)', () => {
  it('each command is node patches of the common document; undo restores the state before, redo the state after', () => {
    expectUndoProperty(() => serviceThree().s, OPS, (path) => path[0] === 'common' && path[1] === 'BPMN');
  }, 120_000);
});

describe('node patches and the per-product memo', () => {
  it('marking a service is attribute patches (< 1 KB); fixing a split adds the seeded shares (< 2 KB)', () => {
    const t = serviceThree(), size = () => JSON.stringify(t.s.getState().history.undo.at(-1)!.patches).length;
    expect(setSharedLineSplit(t.line, 'fixed')).toBe(true);
    expect(size()).toBeLessThan(2000);
    expect(setUnitService('qa', false)).toBe(true);
    expect(size()).toBeLessThan(1000);
  });
  it('a team edit moves no effort share: the other products keep their resolved case (identity)', () => {
    const t = serviceThree(), cases = t.ids.map((id) => resolveProduct(pf(t.s), id)), shares = lineShares(pf(t.s), sharedLines(pf(t.s))[0]!);
    updateTeamRow(0, 'etp', 9);
    expect(lineShares(pf(t.s), sharedLines(pf(t.s))[0]!)).toEqual(shares);
    const next = t.ids.map((id) => resolveProduct(pf(t.s), id));
    expect(next[0]).not.toBe(cases[0]); expect(next[1]).toBe(cases[1]); expect(next[2]).toBe(cases[2]);
  });
});

const edit = (): void => {
  addOrgUnit({ id: 'qa', name: 'QA service', type: 'centreOfExcellence' });
  setUnitService('qa', true); setServiceSkills('qa', ['Test/QA', 'Software Quality Assurance (SQA)']); setServiceRoles('qa', ['role-qa']);
  const l = addServiceLine('qa', 'Test/QA')!;
  addServiceLine('qa', 'Dev');
  setSharedLineSplit(l, 'fixed');
  setActivityRaci('A018', { R: ['role-qa'], C: [], I: [] });
};
const NOW = () => new Date(0);
const saved = (p: Portfolio): string => JSON.stringify(toPortfolioSnapshot(p, NOW));

describe('the services through every persistence path', () => {
  it('save -> open: the same document and lines; save -> open -> save is byte-identical', () => {
    freshStore(); edit();
    const p = pfNow(), a = saved(p), back = openSnapshot(JSON.parse(a) as Record<string, unknown>);
    expect(serialize(back.common.BPMN)).toBe(serialize(p.common.BPMN));
    expect(sharedLines(back)).toEqual(sharedLines(p));
    expect(readStoredOrg(back.common.BPMN).units.find((u) => u.id === 'qa')!.service).toEqual({ skills: ['Test/QA', 'Software Quality Assurance (SQA)'],
      roles: ['role-qa'] });
    expect(saved(back)).toBe(a);
  });
  it('autosave: the record restores them with their undo history', () => expectAutosaveRestores(edit));
  it('tab sync: the other tab receives them as patches', () => expectTabSync(edit));
  it('parameters workbook: the lines keep their unit, split and shares (the units stay in the document); an unknown unit is refused', async () => {
    const t = serviceThree(); setSharedLineSplit(t.line, 'fixed'); addServiceLine('qa', 'Dev');
    const before = pfNow(), b = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    const file = { name: 'pf.xlsx', size: b.byteLength, arrayBuffer: async () => b };
    setSharedLineUnit(t.line, null); updateSharedLine(t.line, 'etp', 7);   // edits the workbook undoes
    await importParamsWorkbook(file, ENV);
    const after = pfNow();
    expect(sharedLines(after)).toEqual(sharedLines(before));
    expect(readStoredOrg(after.common.BPMN).units.find((u) => u.id === 'qa')!.service).toEqual({ skills: ['Test/QA'], roles: [] });
    for (const p of before.products) expect(resolveProduct(after, p.id).teamIn).toStrictEqual(resolveProduct(before, p.id).teamIn);
    freshStore();   // a case without the unit `qa`: the workbook's lines name a unit it does not hold
    await expect(importParamsWorkbook(file, ENV)).rejects.toThrow(/unit must be a unit of the organisation/);
  }, 60_000);
});
