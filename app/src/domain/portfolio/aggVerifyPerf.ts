/** @calc-zone aggregate-views */
import { complianceView } from '../verifyB/compliance';
import { execView, productivityView, qualityAnchorView, velocityView } from '../verifyB/breakdowns';
import { colOf, productRows, sum, viewMemo, type VCol, type VTable } from './aggVerifyBase';
import { weightedAutomation, weightedVelocity } from './headline';
import { portfolioGantt } from './portfolioGantt';

const col = (key: string, header: string, kind: VCol['kind'] = 'int', title?: string): VCol => ({ key, header, kind, title });
const BLANK = { start: null, end: null, first: null, s0: null, s1: null, s2: null, s3: null };

/**
 * Execution timeline of a selection: where each product sits on the calendar (start, ramp end, first agent vFTE) and its sprint velocity; the line is
 * the programme span.
 */
export const execTable = viewMemo((sel, pf): VTable => {
  const g = portfolioGantt(pf, sel.c), rows = g.waves.flatMap((w) => w.products), by = new Map(rows.map((p) => [p.id, p]));
  const at = (id: string) => by.get(id)!;
  const lines = productRows(sel, (v, l) => {
    const p = at(v.id), s = execView(l.c).sprints, first = p.milestones.find((m) => m.label === 'First agent vFTE');
    return { start: sel.cal.dateAt(v.month0), end: sel.cal.dateAt(p.to), first: first?.date ?? '—', s0: s[0]![1], s1: s[1]![1], s2: s[2]![1], s3: s[3]![1] };
  });
  const from = Math.min(...sel.items.map((v) => v.month0)), to = Math.max(...sel.items.map((v) => at(v.id).to));
  return { columns: [col('start', 'Starts', 'text', 'Wave start + product offset, on the portfolio calendar'), col('end', 'Ramp ends', 'text'), col('first', 'First agent vFTE', 'text'),
    col('s0', 'Sprint velocity AS-IS'), col('s1', 'Y1'), col('s2', 'Y2'), col('s3', 'Horizon end')], rows: lines,
  total: sel.items.length ? { ...BLANK, start: sel.cal.dateAt(from), end: sel.cal.dateAt(to) } : BLANK };
});

/** Productivity of a selection: artifacts per engineer per month (AS-IS and horizon end) of each product; the line weights the products by their entry team. */
export const productivityTable = viewMemo((sel): VTable => {
  const rows = productRows(sel, (v, l) => {
    const p = productivityView(l.c), asis = sum(p.rows.map((r) => r.asis)), end = sum(p.rows.map((r) => r.y3));
    return { cats: p.count, intensity: p.intensity, asis, end, factor: asis > 0 ? end / asis : null, base: v.run.baseEtp };
  });
  const w = sum(colOf(rows, 'base')), mean = (k: string) => (w > 0 ? sum(rows.map((r) => +(r.cells.base ?? 0) * +(r.cells[k] ?? 0))) / w : 0);
  const asis = mean('asis'), end = mean('end');
  return { columns: [col('cats', 'Categories in scope'), col('intensity', 'Scope intensity (% auto)', 'pct'), col('asis', 'AS-IS (per eng./month)', 'n1'), col('end', 'Horizon end (per eng./month)', 'n1'),
    col('factor', 'Factor (x)', 'n2'), col('base', 'Entry FTE', 'n1')], rows, total: { cats: null, intensity: null, asis, end, factor: asis > 0 ? end / asis : null, base: w } };
});

/**
 * Velocity of a selection: sprint velocity from AS-IS to the horizon end and the lead time of each product; the uplift line is `weightedVelocity`
 * (entry-team weighted).
 */
export const velocityTable = viewMemo((sel): VTable => {
  const rows = productRows(sel, (v, l) => {
    const d = velocityView(l.c), lead = d.rows.find((r) => r.label === 'Lead time')?.cells;
    return { v0: d.velocity[0]!, v1: d.velocity[1]!, v2: d.velocity[2]!, v3: d.velocity[3]!, uplift: v.run.velocityPct(), lead: lead ? `${lead[0]} → ${lead[3]}` : '—' };
  });
  return { columns: [col('v0', 'Velocity AS-IS (SP/sprint)'), col('v1', 'Y1'), col('v2', 'Y2'), col('v3', 'Horizon end'), col('uplift', 'Velocity uplift (model)', 'n1', 'Entry-team weighted on the selection line'),
    col('lead', 'Lead time', 'text')], rows, total: { v0: null, v1: null, v2: null, v3: null, uplift: weightedVelocity(sel.items.map((v) => v.run)), lead: null } };
});

const METRICS: [string, string][] = [['bugs', 'Bugs/1000 LOC'], ['cov', 'Test coverage'], ['leak', 'Defect leakage %'], ['enps', 'eNPS']];

/** Quality of a selection: AS-IS → horizon-end value of the main metrics per product (ratios do not add up); the line counts the overridden anchors. */
export const qualityTable = viewMemo((sel): VTable => {
  const rows = productRows(sel, (_v, l) => {
    const q = qualityAnchorView(l.c).rows, one = (n: string) => q.find((r) => r.name === n);
    return { ...Object.fromEntries(METRICS.map(([k, n]) => [k, one(n) ? `${one(n)!.asis} → ${one(n)!.y3}` : '—'])), edited: q.filter((r) => r.asisEdited || r.targetEdited).length };
  });
  return { columns: [...METRICS.map(([k, n]) => col(k, n, 'text', 'AS-IS → horizon end')), col('edited', 'Overridden anchors')], rows, total: { ...Object.fromEntries(METRICS.map(([k]) => [k, null])), edited: sum(colOf(rows, 'edited')) } };
});

/**
 * Compliance of a selection: sector, glass ceiling, automatable maximum and regulatory artifacts of each product; the line is the entry-team weighted
 * ceiling and the artifact count.
 */
export const complianceTable = viewMemo((sel): VTable => {
  const rows = productRows(sel, (_v, l) => {
    const s = complianceView(l.c).sectors.find((x) => x.selected), ceil = l.m.ceiling;
    return { industry: s?.name ?? '—', norms: s?.norms ?? '—', ceiling: ceil, max: 100 - ceil, reg: s?.reg ?? 0 };
  });
  const { ceiling } = weightedAutomation(sel.items.map((v) => v.run));
  return { columns: [col('industry', 'Sector', 'text'), col('norms', 'Standards', 'text'), col('ceiling', 'Glass ceiling', 'pct'), col('max', 'Max automatable', 'pct'), col('reg', 'Reg. artifacts')],
    rows, total: { industry: null, norms: null, ceiling, max: 100 - ceiling, reg: sum(colOf(rows, 'reg')) } };
});
