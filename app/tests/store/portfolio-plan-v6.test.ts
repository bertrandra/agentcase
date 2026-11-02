import { describe, expect, it } from 'vitest';
import { readPortfolioPlan } from '@/domain/portfolio/portfolioProcess';
import { openChecked } from '@/store/persistence/schema';
import { SNAPSHOT_SCHEMA_VERSION } from '@/store/persistence/schema/version';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../helpers/bpmnValidate';
import { fixtureText, openPortfolioFixture } from '../helpers/portfolioFixtures';

/**
 * SPEC_FIXES FX-D14 (a), schema v6: a saved portfolio holds its waves (sub-processes), setup capacity (on the lane set) and knowledge subsets
 * (on each product's call activity) in its common BPMN document, not as JSON keys; opening it gives the same portfolio; a v5 file still opens.
 */
const NOW = () => new Date('2026-11-02T10:00:00Z');
type Rec = Record<string, unknown>;

describe('schema v6: the portfolio plan in the common BPMN document', () => {
  const pf0 = openPortfolioFixture(), pf = { ...pf0, maxConcurrentSetups: 2,
    waves: pf0.waves.map((w, i) => (i === 1 ? { ...w, note: 'after the pilot', dependsOn: { waveId: pf0.waves[0]!.id, milestone: 'setupEnd' as const, lagMonths: 1 } } : w)),
    products: pf0.products.map((p, i) => (i === 0 ? { ...p, knowledge: { enabled: true, targetCC: 3 } } : p)) };
  const file = toPortfolioSnapshot(pf, NOW) as Rec, common = file.common as Rec;
  it('the file is v6, has no waves / capacity / knowledge keys, and its common document holds the plan', () => {
    expect(file._schemaVersion).toBe(6);
    expect(SNAPSHOT_SCHEMA_VERSION).toBe(6);
    expect(file.waves).toBeUndefined();
    expect(file.maxConcurrentSetups).toBeUndefined();
    expect((file.products as Rec[]).every((p) => p.knowledge === undefined)).toBe(true);
    const plan = readPortfolioPlan(parseBpmn(common.BPMN as string).doc!)!;
    expect(plan.waves).toEqual(pf.waves);
    expect(plan.maxConcurrentSetups).toBe(2);
    for (const p of pf.products) expect(plan.knowledge[p.id]).toEqual(p.knowledge);
    expect(pf.products.some((p) => (p.knowledge.domains ?? []).length > 0)).toBe(true);   // the fixture has domains: they travel too
  });
  it('round trip: opening the file gives the same waves, capacity and knowledge subsets; the plan is not left in the common document', () => {
    const back = openChecked(JSON.parse(JSON.stringify(file))).portfolio;
    expect(back.waves).toEqual(pf.waves);
    expect(back.maxConcurrentSetups).toBe(2);
    expect(back.products.map((p) => p.knowledge)).toEqual(pf.products.map((p) => p.knowledge));
    expect(readPortfolioPlan(back.common.BPMN)).toBeNull();
    expect(toPortfolioSnapshot(back, NOW)).toEqual(file);
  });
  it('a v5 file (waves as keys) opens as before', () => {
    const v5 = JSON.parse(fixtureText('pf-three-products')) as Rec, back = openChecked(v5).portfolio;
    expect(back.waves).toEqual(openPortfolioFixture().waves);
  });
  it('the common document with the plan validates against the schemas', () => {
    if (!schemaTestsRun()) return;
    const r = validateText(common.BPMN as string, 'portfolio.bpmn')!;
    // the only findings are the teams' references to the default delivery unit, which a portfolio file does not store (derived): none from the plan
    expect(r.errors.filter((e) => !/ac:team\/@unit="unit-delivery"/.test(e.message))).toEqual([]);
  }, 60_000);
});
