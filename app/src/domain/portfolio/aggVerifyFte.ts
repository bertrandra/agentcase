import { periodRows, fteSummary } from '../verifyA/fteVfte';
import { valueRows } from '../verifyA/phaseArt';
import { colOf, productRows, sum, viewMemo, type VCol, type VTable } from './aggVerifyBase';

const COLS: VCol[] = [
  { key: 'base', header: 'Entry FTE', title: 'AS-IS team of the product', kind: 'n1' },
  { key: 'human', header: 'Human FTE', title: 'At the end of the product\'s own horizon', kind: 'n1' },
  { key: 'agent', header: 'Agent vFTE', kind: 'n1' },
  { key: 'total', header: 'Total effort (FTE-eq)', kind: 'n1' },
  { key: 'reduction', header: 'Effort reduction', kind: 'pct' },
  { key: 'freed', header: 'Freed capacity (FTE)', kind: 'n1' },
];

export interface FteYear { label: string; human: number; agent: number; total: number }
export interface FteVfteAgg {
  label: string;
  /** calendar year-end headcount of the selection: human FTE and agent vFTE of the products that have started */
  years: FteYear[];
  chart: { labels: string[]; human: number[]; agent: number[]; products: { label: string; human: number[]; agent: number[] }[] };
  table: VTable;
}

/** FTE / vFTE of a selection: calendar trajectory (the consolidated `humanFte` / `agentVfte` series) and the end-of-horizon split of each product. */
export const fteVfteAgg = viewMemo((sel): FteVfteAgg => {
  const L = sel.series.net.length, n = Math.ceil(L / 12), end = (a: number[], k: number) => a[Math.min(12 * k + 11, L - 1)] ?? 0;
  const years = Array.from({ length: n }, (_, k) => {
    const human = end(sel.series.humanFte, k), agent = end(sel.series.agentVfte, k);
    return { label: `Year ${k + 1}`, human, agent, total: human + agent };
  });
  const rows = productRows(sel, (_v, l) => {
    const s = fteSummary(l), human = l.eng.year(l.eng.horizonYears).humanFteEnd;
    return { base: l.m.base.etp, human, agent: s.agent, total: s.total, reduction: s.reduction, freed: s.freed };
  });
  const base = sum(colOf(rows, 'base')), human = sum(colOf(rows, 'human'));
  const total = { base, human, agent: sum(colOf(rows, 'agent')), total: sum(colOf(rows, 'total')), freed: sum(colOf(rows, 'freed')), reduction: base > 0 ? Math.round((1 - human / base) * 100) : null };
  return {
    label: sel.label, years,
    chart: { labels: Array.from({ length: L }, (_, i) => sel.cal.dateAt(i)), human: sel.series.humanFte, agent: sel.series.agentVfte,
      products: sel.items.map((v) => ({ label: v.name, human: v.series.humanFte, agent: v.series.agentVfte })) },
    table: { columns: COLS, rows, total },
  };
});

const OV: VCol[] = [
  { key: 'base', header: 'Entry FTE', kind: 'n1' },
  { key: 'human', header: 'Human FTE', title: 'Horizon end', kind: 'n1' },
  { key: 'agent', header: 'Agent vFTE', kind: 'n1' },
  { key: 'total', header: 'Total effort (FTE-eq)', title: 'Conserved: equals the entry team', kind: 'n1' },
  { key: 'ramp', header: 'Automation % at horizon end', kind: 'pct' },
  { key: 'freed', header: 'Reduction vs AS-IS (FTE)', kind: 'n1' },
  { key: 'arts', header: 'In-scope artifacts', kind: 'int' },
  { key: 'va', header: 'of which VA (core value)', kind: 'int' },
];

/** vFTE overview of a selection: horizon-end composition of every product (period table's last line) and its artifact value counts; sums are FTE and counts. */
export const vfteOvTable = viewMemo((sel): VTable => {
  const rows = productRows(sel, (_v, l) => {
    const last = periodRows(l).at(-1)!, cats = valueRows(l);
    return { base: l.m.base.etp, human: last.human, agent: last.agent, total: last.total, ramp: last.ramp, freed: last.freed,
      arts: sum(cats.map((c) => c.n)), va: cats.find((c) => c.value === 'VA')?.n ?? 0 };
  });
  const total = Object.fromEntries(['base', 'human', 'agent', 'total', 'freed', 'arts', 'va'].map((k) => [k, sum(colOf(rows, k))]));
  return { columns: OV, rows, total: { ...total, ramp: null } };
});
