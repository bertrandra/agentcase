/** @calc-zone aggregate-views */
import { qualityAnchorView } from '../verifyB/breakdowns';
import { daFmt, daGet, daVal } from '../verifyB/anchors';
import { perfFrame } from '../verifyB/perf';
import { colOf, liveOf, productRows, sum, viewMemo, type CellKind, type VCol, type VSel, type VTable } from './aggVerifyBase';
import type { ProductView } from './waves';
import { scopeHeadline, type PortfolioHeadline } from './portfolioHeadline';

/** A before / after line of the selection; `change` is a relative change in percent (or points for a percentage), null when the base is nil. */
export interface BeforeAfter { metric: string; asis: number | null; tobe: number | null; change: number | null; kind: CellKind; title?: string }

const rel = (now: number, was: number): number | null => (was > 0 ? (now / was - 1) * 100 : null);
const head = (sel: VSel): PortfolioHeadline => scopeHeadline(sel.c, sel.scope)!.headline;
const col = (key: string, header: string, kind: VCol['kind'] = 'n1', title?: string): VCol => ({ key, header, kind, title });

/** Run cost per year and headcount at the horizon end of one product (the figures `kpiView` prints). */
const endOf = (v: ProductView) => v.run.engine.year(v.run.engine.horizonYears);

export interface KpiAgg { label: string; headline: PortfolioHeadline; consolidated: BeforeAfter[]; table: VTable }

/**
 * KPI scorecard of a selection: the consolidated financial headline, the capacity KPIs before / after (weighted where they are ratios) and the
 * non-additive KPIs product by product.
 */
export const kpiAgg = viewMemo((sel): KpiAgg => {
  const h = head(sel), run0 = sum(sel.items.map((v) => liveOf(v).m.baselineRun)), runEnd = sum(sel.items.map((v) => endOf(v).totalRunCost));
  const consolidated: BeforeAfter[] = [
    { metric: 'Headcount (FTE)', asis: h.fte.before, tobe: h.fte.after, change: rel(h.fte.after, h.fte.before), kind: 'n1' },
    { metric: 'Run cost / year', asis: run0, tobe: runEnd, change: rel(runEnd, run0), kind: 'eur' },
    { metric: 'Freed capacity (FTE)', asis: 0, tobe: h.fte.before - h.fte.after, change: null, kind: 'n1' },
    { metric: 'Effective automation (weighted)', asis: 0, tobe: h.eff, change: h.eff, kind: 'pct', title: 'Weighted by the entry team of each product' },
    { metric: 'Glass ceiling (weighted)', asis: 100, tobe: h.ceiling, change: h.ceiling - 100, kind: 'pct' },
    { metric: 'Velocity uplift (weighted)', asis: 0, tobe: h.velocityPct, change: h.velocityPct, kind: 'pct' },
  ];
  const rows = productRows(sel, (v, l) => {
    const f = perfFrame(l.c), e = endOf(v), q = qualityAnchorView(l.c).rows.find((r) => r.name === 'Test coverage'), a = v.run.automation();
    return { base: v.run.baseEtp, after: e.totalHumanFteEnd, change: rel(e.totalHumanFteEnd, v.run.baseEtp), run0: f.m.baselineRun, runEnd: e.totalRunCost,
      eff: a.eff, ceiling: a.ceiling,
      uplift: v.run.velocityPct(), cov: q ? `${q.asis} → ${q.y3}` : '—',
        lead: `${daFmt(l.c.s, 'leadTime', daGet(l.c.s, 'leadTime').asis)} → ${daFmt(l.c.s, 'leadTime', daVal(l.c.s, 'leadTime', f.r3))}` };
  });
  const base = sum(colOf(rows, 'base')), after = sum(colOf(rows, 'after'));
  const total = { base, after, change: rel(after, base), run0, runEnd, eff: h.eff, ceiling: h.ceiling, uplift: h.velocityPct, cov: null, lead: null };
  const columns = [col('base', 'Headcount AS-IS (FTE)'), col('after', 'Headcount at horizon end (FTE)'), col('change', 'Change', 'pct'),
    col('run0', 'Run cost / year AS-IS', 'eur'), col('runEnd', 'Run cost / year at horizon end', 'eur'),
    col('eff', 'Effective automation', 'pct'), col('ceiling', 'Glass ceiling', 'pct'), col('uplift', 'Velocity uplift', 'pct'),
      col('cov', 'Test coverage', 'text', 'AS-IS → horizon end'), col('lead', 'Lead time', 'text', 'AS-IS → horizon end')];
  return { label: sel.label, headline: h, consolidated, table: { columns, rows, total } };
});

export interface AsisTobeAgg { label: string; years: number; rows: BeforeAfter[]; table: VTable }

/**
 * AS-IS vs TO-BE of a selection: headcount, reference cost vs to-be cost, setup, automation and glass ceiling consolidated; per product, the same
 * before / after figures.
 */
export const asisTobeAgg = viewMemo((sel): AsisTobeAgg => {
  const h = head(sel), cr = h.costReduction;
  const rows: BeforeAfter[] = [
    { metric: 'Headcount (FTE)', asis: h.fte.before, tobe: h.fte.after, change: rel(h.fte.after, h.fte.before), kind: 'n1' },
    { metric: `Reference cost over ${cr.years} years`, asis: cr.ok ? cr.base : null, tobe: cr.ok ? cr.tobe : null,
      change: cr.ok ? rel(cr.tobe, cr.base) : null, kind: 'eur',
      title: 'AS-IS cost vs TO-BE cost (cost - savings + setup), components summed over the products' },
    { metric: 'Setup investment', asis: 0, tobe: cr.setup, change: null, kind: 'eur' },
    { metric: 'Effective automation (weighted)', asis: 0, tobe: h.eff, change: h.eff, kind: 'pct' },
    { metric: 'Glass ceiling (weighted)', asis: 100, tobe: h.ceiling, change: h.ceiling - 100, kind: 'pct' },
  ];
  const lines = productRows(sel, (v) => {
    const c = v.run.cost(), a = v.run.automation(), after = endOf(v).totalHumanFteEnd, tobe = c.base - c.sav + c.setup;
    return { base: v.run.baseEtp, after, cost0: c.base, cost1: tobe, change: rel(tobe, c.base), setup: c.setup, eff: a.eff, ceiling: a.ceiling };
  });
  const total = { base: h.fte.before, after: h.fte.after, cost0: cr.ok ? cr.base : null, cost1: cr.ok ? cr.tobe : null,
    change: cr.ok ? rel(cr.tobe, cr.base) : null, setup: cr.setup, eff: h.eff, ceiling: h.ceiling };
  const columns = [col('base', 'Headcount AS-IS (FTE)'), col('after', 'Headcount TO-BE (FTE)'), col('cost0', 'Reference cost', 'eur'),
    col('cost1', 'TO-BE cost', 'eur'), col('change', 'Cost change', 'pct'),
    col('setup', 'Setup', 'eur'), col('eff', 'Effective automation', 'pct'), col('ceiling', 'Glass ceiling', 'pct')];
  return { label: sel.label, years: cr.years, rows, table: { columns, rows: lines, total } };
});
