import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import type { CaseState } from '@/domain';
import demo from '@/domain/factory/demo.json';
import { generateFactory } from '@/domain/factory/generate';
import { fgGrid, fgPhaseWindows } from '@/domain/factory/grid';
import { factoryTasks, KPIS, kpiCard, type KpiData } from '@/domain/factory/kpi';
import { fgParams } from '@/domain/factory/params';
import { fgPreflight } from '@/domain/factory/preflight';
import type { FactoryData } from '@/domain/factory/types';
import { digest } from '../helpers/digest';
import { legacyJson } from '../helpers/deviations';
import { diffValues, extraIds, loadCase, loadExtra, pick } from '../helpers/oracleDiff';

type Json = Record<string, unknown> & { error?: string; skipped?: boolean };
type Case = CaseState & Partial<FactoryData> & { FG_PARAMS?: Partial<ReturnType<typeof fgParams>> };
const ids = extraIds('fm_gen');
const ctxOf = (id: string) => { const s = loadCase<Case>(id); return { s, c: makeCtx(s), p: fgParams(s.FG_PARAMS) }; };
const ARRAYS = ['PORTFOLIO_ITEMS', 'EPICS', 'FEATURES', 'STORIES', 'SPRINTS', 'PROGRAM_INCREMENTS', 'STORY_ASSIGNMENTS', 'RELEASES', 'RELEASE_ITEMS', 'RELEASE_CANDIDATES', 'APPROVALS',
  'DEPLOYMENTS', 'ENVIRONMENTS', 'COMMITS', 'BUILDS', 'BUILD_ARTIFACTS', 'QUALITY_GATES', 'MONITORING_EVENTS', 'FEEDBACK_ITEMS', 'BACKLOG_ITEMS'] as const;
const seen = (v: unknown[] | undefined) => v ?? [];
/** The digest the oracle records of a factory dataset (counts + canonical hash per array). */
function dump(d: FactoryData, phaseFeatures: Record<string, string[]>, storyOf: Record<string, string>) {
  const o: Record<string, unknown> = {};
  for (const k of ARRAYS) o[k] = digest(seen(d[k]));
  o.vision = d.VISION.statement; o.integrated = d.INTEGRATED_PRODUCT;
  o.phaseFeatures = digest(Object.entries(phaseFeatures).filter(([, f]) => f.length).map(([id, featureIds]) => ({ id, featureIds })));
  o.storyOf = digest([storyOf]);
  return o;
}

describe('factory domain reproduces the legacy oracle', () => {
  it('has the oracle fixtures (base cases, demo, generated)', () => { expect(ids.length).toBeGreaterThanOrEqual(50); expect(ids).toContain('fm-generated-tuned'); });
  const kpiData = (s: Case, c: ReturnType<typeof makeCtx>) => ({ DEPLOYMENTS: s.DEPLOYMENTS ?? [], ENVIRONMENTS: s.ENVIRONMENTS ?? [], RELEASE_CANDIDATES: s.RELEASE_CANDIDATES ?? [], MONITORING_EVENTS: s.MONITORING_EVENTS ?? [],
      APPROVALS: s.APPROVALS ?? [], QUALITY_GATES: s.QUALITY_GATES ?? [], COMMITS: s.COMMITS ?? [], BUILDS: s.BUILDS ?? [], FEEDBACK_ITEMS: s.FEEDBACK_ITEMS ?? [], tasks: factoryTasks(c) } as KpiData);
  it.each(ids)('KPIs, tasks and sample sizes · %s', (id) => {
    const { s, c, p } = ctxOf(id), exp = loadExtra<Json>('fm_kpi', id) as Record<string, { v: number; n: number | null }> & { tasks: number };
    const d = kpiData(s, c);
    const got: Record<string, unknown> = { tasks: d.tasks.length, minSample: Math.max(1, p.minSample) };
    KPIS.forEach((k) => { got[k.id] = { v: k.get(d), n: k.sample ? k.sample(d) : null }; });
    // a rate without a sample counter reports null in the legacy extra too
    expect(diffValues(exp, got, 'kpi').slice(0, 6)).toEqual([]);
  });
  it.each(ids)('KPI cards: display text and the insufficient-sample dash · %s', (id) => {
    const { s, c, p } = ctxOf(id), d = kpiData(s, c), exp = loadExtra<Record<string, { thin: boolean; n: number | null; disp: string }>>('fm_cards', id);
    const got = Object.fromEntries(KPIS.map((k) => { const x = kpiCard(k, d, p); return [k.id, { thin: x.thin, n: x.n, disp: x.display }]; }));
    expect(diffValues(exp, got, 'cards').slice(0, 6)).toEqual([]);
  });
  it.each(ids)('week grid and phase windows · %s', (id) => {
    const { c } = ctxOf(id), g = fgGrid(c), w = fgPhaseWindows(c, g);
    const got: Record<string, unknown> = { totalW: g.totalW, first: g.date(1), d9: g.date(9, 3) };
    Object.entries(w).forEach(([k, v]) => { got[k] = [v.sw, v.ew, v.arts.length]; });
    expect(diffValues(loadExtra('fm_win', id), got, 'win').slice(0, 6)).toEqual([]);
  });
  it.each(ids)('preflight · %s', (id) => {
    const { c, p } = ctxOf(id), exp = loadExtra<Json>('fm_pre', id);
    if (!exp.ok) return;
    expect(diffValues(exp, fgPreflight(c, p), 'pre').slice(0, 6)).toEqual([]);
  });
  it.each(ids)('weekly generation (same seed, same records) · %s', (id) => {
    const { c, p } = ctxOf(id), exp = loadExtra<Json>('fm_gen', id), gen = generateFactory(c, p, '2026-01-01T00:00:00.000Z');
    if (exp.skipped) { expect(gen).toBeNull(); return; }
    expect(gen).not.toBeNull();
    const got = { ...dump(gen!.data, gen!.phaseFeatures, gen!.storyOf), provenance: pick(gen!.provenance, ['seed', 'weeks', 'volScale', 'curve', 'curveMeans', 'from', 'phases', 'ramps', 'eff', 'ceiling', 'records']) };
    const strip = (o: Json) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && typeof v === 'object' && 'head' in v ? { n: (v as Json).n, h: (v as Json).h } : v]));
    expect(diffValues(legacyJson(strip(exp)), got, 'gen').slice(0, 8)).toEqual([]);
  });
  it('the demo dataset is the legacy one', () => {
    const exp = loadExtra<Json>('fm_demo', 'golden');
    const d = { ...demo, INTEGRATED_PRODUCT: demo.INTEGRATED_PRODUCT } as unknown as FactoryData & { phaseFeatures: { id: string; featureIds: string[] }[] };
    const pf = Object.fromEntries(demo.phaseFeatures.map((x) => [x.id, x.featureIds]));
    const got = dump(d, pf, demo.storyOf as Record<string, string>);
    const strip = (o: Json) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && typeof v === 'object' && 'head' in v ? { n: (v as Json).n, h: (v as Json).h } : v]));
    const e = strip(exp);
    // the legacy demo never touches sprints / program increments / story assignments
    ['SPRINTS', 'PROGRAM_INCREMENTS', 'STORY_ASSIGNMENTS', 'ENVIRONMENTS'].forEach((k) => { delete e[k]; delete got[k]; });
    expect(diffValues(e, got, 'demo').slice(0, 6)).toEqual([]);
  });
});
