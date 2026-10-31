import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { scopeProgramme } from '@/domain/portfolio/aggProgramme';
import { resolveProduct, scheduledProducts } from '@/domain/portfolio';
import { serialize } from '@/domain/process';
import { costProfileKey, descriptionKey, engineProfile, LINKED_SECTION, MILESTONE_NAMES, PROGRAMME_ACTIVITIES, programmeProcess, programmeTable,
  type ProgrammeRow } from '@/domain/programme';
import { programmeDocument } from '@/domain/programme/bpmn';
import type { CaseState } from '@/domain/types/state';
import { SECTIONS } from '@/ui/zones/registry';
import { FIXTURE_IDS, loadCase } from '../../helpers/portfolio';
import { openPortfolioFixture } from '../../helpers/portfolioFixtures';

/** SPEC_BPMN § 19.11 F-B79 (phase B9e): the 📋 Programme table, read from the owners (programme view, cost profile, activity meta). */
const withValues = (s: CaseState, values: Record<string, string>): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, ...values } } });
const table = (s: CaseState) => { const c = makeCtx(s); return programmeTable(c, programmeProcess(c)); };
const row = (rows: ProgrammeRow[], kind: string): ProgrammeRow => rows.find((r) => r.kind === kind)!;
const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);

describe('the programme table', () => {
  it.each(FIXTURE_IDS)('%s: one row per activity and milestone; the rows\' years add up to the totals row, the engine\'s programme cost', (id) => {
    const s = loadCase(id), t = table(s), H = engineProfile(makeCtx(s)).setup.length;
    expect(t.rows.map((r) => r.kind)).toEqual([...PROGRAMME_ACTIVITIES.map((a) => a.kind), ...MILESTONE_NAMES.map((m) => m.kind)]);
    expect(t.years).toHaveLength(H / 12);
    t.years.forEach((y, i) => expect(sum(t.rows.map((r) => r.years?.[i] ?? 0))).toBeCloseTo(y, 6));
    expect(t.total).toBeCloseTo(sum(engineProfile(makeCtx(s)).setup), 6);
  });
  it('golden: Enabled — opt-in unticked and editable by its switch, the hub follows its module, the setup lines required', () => {
    const t = table(loadCase('golden'));
    expect(row(t.rows, 'hypercare').enabled).toMatchObject({ on: false, locked: false, key: 'optHypercare' });
    expect(row(t.rows, 'stage-validate').enabled).toMatchObject({ on: false, key: 'optStages' });
    expect(row(t.rows, 'hubSetup').enabled).toMatchObject({ on: true, locked: true, key: null });
    expect(row(t.rows, 'setupTooling').enabled).toMatchObject({ on: true, locked: true });
    expect(row(t.rows, 'gate-L2').enabled.on).toBe(true);
    expect(row(table(withValues(loadCase('golden'), { optHypercare: 'on' })).rows, 'hypercare').enabled.on).toBe(true);
  });
  it('golden: cost detail of coaching (2 days a month over its calibrated months, the role rate) and of training (0.5 FTE over 12 months)', () => {
    const t = table(loadCase('golden')), co = row(t.rows, 'setupCoaching').detail!, tr = row(t.rows, 'setupTraining').detail!;
    expect(co.perMonth).toBeCloseTo(2, 9);
    expect(co.rate).toBeCloseTo(418 * 1.15, 6);
    expect(co.role).toBe('Preceptor');
    expect(tr.days).toBeCloseTo(0.5 * 12 * (220 / 12), 9);
    expect(tr.perMonth).toBeCloseTo(0.5 * 220 / 12, 9);
    expect(row(t.rows, 'setupTraining').timingParams.map((p) => p.key)).toEqual(['trainMonths']);
    expect(row(t.rows, 'setupTraining').costParams.map((p) => p.key)).toEqual(['trainFte', 'capOps', 'capTrain', 'capTarget']);
    expect(row(t.rows, 'hypercare').costParams.map((p) => p.key)).toEqual(['hypercareFte']);   // the switch is the Enabled tick box
  });
  it('a shared line (the engagement stages) is carried by its first activity, the others name it', () => {
    const t = table(withValues(loadCase('golden'), { optStages: 'on' })), first = row(t.rows, 'stage-discover');
    expect(first.years).not.toBeNull();
    expect(row(t.rows, 'stage-validate')).toMatchObject({ years: null, sharedWith: 'Discover' });
  });
  it('a description of the case\'s own replaces the catalogue\'s in the table, the Process view and the BPMN export; blank restores it', () => {
    const s = withValues(loadCase('golden'), { [descriptionKey('pilot')]: 'Our own pilot.' }), c = makeCtx(s), v = programmeProcess(c);
    expect(row(programmeTable(c, v).rows, 'pilot').description).toBe('Our own pilot.');
    expect(v.activities.find((a) => a.kind === 'pilot')!.description).toBe('Our own pilot.');
    expect(serialize(programmeDocument(v))).toContain('<bpmn:documentation>Our own pilot.</bpmn:documentation>');
    expect(row(table(withValues(s, { [descriptionKey('pilot')]: ' ' })).rows, 'pilot').description).toBe(PROGRAMME_ACTIVITIES.find((a) =>
      a.kind === 'pilot')!.description);
  });
  it('the export carries the type of each activity (ac:costProfile)', () => {
    const c = makeCtx(withValues(loadCase('golden'), { [costProfileKey('tooling')]: 'recurring' })), text = serialize(programmeDocument(programmeProcess(c)));
    expect(text).toMatch(/kind="setupTooling" level="product" costRule="nonLabour" costProfile="recurring"/);
    expect(text).toMatch(/kind="govGates" level="product" costRule="none" costProfile="none"/);
  });
  it('every activity and milestone links to one context section of the catalogue (one map)', () => {
    const ids = new Set(SECTIONS.map((s) => s.id));
    expect(Object.keys(LINKED_SECTION).sort()).toEqual([...PROGRAMME_ACTIVITIES.map((a) => a.kind), ...MILESTONE_NAMES.map((m) => m.kind)].sort());
    expect(Object.values(LINKED_SECTION).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe('Portfolio / Wave aggregate per product', () => {
  it('each product\'s figures are its own table\'s totals; the totals add the products up', () => {
    const pf = openPortfolioFixture(), ids = scheduledProducts(pf).map((p) => p.product.id), a = scopeProgramme(pf, ids);
    expect(a.rows.map((r) => r.id)).toEqual(ids);
    for (const r of a.rows) {
      const t = table(resolveProduct(pf, r.id));
      expect(r.years).toEqual(t.years);
      expect(r.total).toBeCloseTo(t.total, 6);
      expect(r.pilot).toBeCloseTo(t.pilot, 6);
    }
    expect(a.total).toBeCloseTo(sum(a.rows.map((r) => r.total)), 6);
    a.years.forEach((y, i) => expect(y).toBeCloseTo(sum(a.rows.map((r) => r.years[i] ?? 0)), 6));
  });
});
