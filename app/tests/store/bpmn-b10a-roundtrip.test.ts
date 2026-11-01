import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addOrgUnit, removeOrgUnit, setProductOwner } from '@/controllers/org';
import { addSharedLine } from '@/controllers/sharedTeam';
import { addTeamRow, updateTeamRow } from '@/controllers/team';
import { computeCase } from '@/domain';
import { productsOfUnit, readStoredOrg, unitElements, unitTree, withUnits } from '@/domain/org';
import { addSharedLine as addLine, productTeam, resolveProduct, sharedLines, type Portfolio } from '@/domain/portfolio';
import { el, serialize, type XDocument } from '@/domain/process';
import { openChecked } from '@/store/persistence/schema';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { expectAutosaveRestores, expectTabSync } from '../helpers/docRoundTrips';
import { goldenAndB, SHARED_LINE } from '../helpers/portfolio';
import { freshStore } from './helpers';

/**
 * Phase B10a (docs/SPEC_BPMN.md § 21, schema v5): the teams move into the organisation part of the document. A version 2–4 file opens with the
 * same teams and figures; the saved file holds no `teamIn` / `sharedTeam` key; save -> open -> save is byte-identical; the autosave record (with
 * its undo history) and another tab receive the teams as nodes of the document.
 */
const NOW = () => new Date(0);
const FILES = ['fixtures/cases/golden.json', 'fixtures/portfolios/pf-three-products.json', '../docs/examples/AgentCase_Portfolio_Example.json'];
const raw = (f: string): Record<string, unknown> => JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>;
const saved = (pf: Portfolio): string => JSON.stringify(toPortfolioSnapshot(pf, NOW));
const figures = (pf: Portfolio): number[][] => pf.products.map((p) => computeCase(resolveProduct(pf, p.id)).model.yearSav);

/** A version 4 portfolio file (the teams as keys): golden and B, a shared line with pins, a unit edited inside B's own process document. */
function v4File(): Record<string, unknown> {
  const pf = addLine(goldenAndB(), { ...SHARED_LINE, pins: ['A017'] }), file = JSON.parse(saved(pf)) as Record<string, unknown>;
  const products = file.products as Record<string, unknown>[], common = file.common as { BPMN: string };
  products.forEach((p) => { p.teamIn = productTeam(pf, p.id as string); });
  const own = withUnits(openSnapshot(file).common.BPMN as XDocument, [el('ac:orgUnit', { id: 'unit-9', name: 'Old BU', type: 'businessUnit' })]);
  products[1]!.overrides = { BPMN: serialize(own) };
  common.BPMN = common.BPMN.replace(/\n\s*<ac:team [\s\S]*?<\/ac:team>/g, '');   // a version 4 document holds no team
  return { ...file, _schemaVersion: 4, sharedTeam: sharedLines(pf) };
}

describe('v4 -> v5: the teams into the document, the keys removed, the figures identical', () => {
  it.each(FILES)('%s: same teams and figures; the saved file holds no team key; save -> open -> save is byte-identical', (f) => {
    const r = raw(f), pf = openSnapshot(r), a = saved(pf);
    const teams = (r.products as { id: string; teamIn: unknown }[] | undefined)?.map((p) => [p.id, p.teamIn]) ?? [['p1', r.teamIn]];
    for (const [id, rows] of teams) expect(productTeam(pf, id as string)).toStrictEqual(rows);
    expect(a).not.toMatch(/"teamIn"|"sharedTeam"/);
    expect(a).toContain('<ac:team id=\\"team-');
    const back = openSnapshot(JSON.parse(a) as Record<string, unknown>);
    expect(saved(back)).toBe(a);
    expect(figures(back)).toEqual(figures(pf));
  }, 60_000);
  it('a version 4 portfolio: shared lines (pins) into the document, a product\'s own process without its units (moved to the common one)', () => {
    const { portfolio: pf, notes } = openChecked(v4File());
    expect(notes).toEqual([]);
    expect(sharedLines(pf)).toEqual([{ ...SHARED_LINE, pins: ['A017'] }]);
    expect(unitElements(pf.products[1]!.overrides.BPMN as XDocument)).toEqual([]);
    expect(readStoredOrg(pf.common.BPMN).units.map((u) => u.id)).toEqual(['unit-9']);
    expect(resolveProduct(pf, 'B').teamIn.at(-1)).toMatchObject({ shared: 's1', etp: 1, pins: ['A017'] });
    const a = saved(pf);
    expect(saved(openSnapshot(JSON.parse(a) as Record<string, unknown>))).toBe(a);
  });
});

describe('the organisation part through every persistence path', () => {
  const edit = (): void => {
    addTeamRow({ etp: 2 }); updateTeamRow(0, 'etp', 6);
    addOrgUnit({ id: 'unit-1', name: 'BU', type: 'businessUnit' });
    setProductOwner('p1', 'unit-1');
    addSharedLine({ allocations: { p1: 30 } });
  };
  it('save -> open (single case and portfolio): same document', () => {
    const s = freshStore(); addTeamRow({ etp: 2 });
    const one = JSON.parse(saved(s.getState().portfolio)) as Record<string, unknown>;
    expect(one._schema).toBe('agentcase.snapshot.v1');
    expect(one).not.toHaveProperty('teamIn');
    expect(serialize(openSnapshot(one).common.BPMN)).toBe(serialize(s.getState().portfolio.common.BPMN));
    edit();
    const pf = s.getState().portfolio, back = openSnapshot(JSON.parse(saved(pf)) as Record<string, unknown>);
    expect(serialize(back.common.BPMN)).toBe(serialize(pf.common.BPMN));
  });
  it('autosave: the record restores the teams and units with their undo history', () => expectAutosaveRestores(edit));
  it('tab sync: the other tab receives them as patches', () => expectTabSync(edit));
});

describe('units at any depth, one owning unit per product (F-B80, D-B39)', () => {
  it('a chain of eight levels; a product owned at the deepest level belongs to every ancestor; the unit cannot go while it owns', () => {
    const s = freshStore();
    for (let i = 1; i <= 8; i++) expect(addOrgUnit({ id: `unit-${i}`, name: `Level ${i}`, type: 'department', parent: i > 1 ? `unit-${i - 1}` : undefined }))
      .toBe(true);
    expect(setProductOwner('p1', 'unit-8')).toBe(true);
    const m = { units: readStoredOrg(s.getState().portfolio.common.BPMN).units };
    expect(unitTree(m).map((x) => x.depth)).toEqual([0, 0, 1, 2, 3, 4, 5, 6, 7]);   // the stored default delivery unit (FX-07), then the chain
    const products = [{ id: 'p1', name: 'P', owner: 'unit-8' }];
    expect(productsOfUnit(m.units, products, 'unit-1').map((p) => p.id)).toEqual(['p1']);
    expect(productsOfUnit(m.units, products, null)).toEqual([]);
    expect(setProductOwner('p1', 'nope')).toBe(false);
    expect(removeOrgUnit('unit-8')).toBe(false);
    expect(setProductOwner('p1', null)).toBe(true);
    expect(removeOrgUnit('unit-8')).toBe(true);
    expect(productsOfUnit(m.units, [{ id: 'p1', name: 'P' }], null).map((p) => p.id)).toEqual(['p1']);
  });
});
