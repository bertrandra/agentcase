/** @calc-zone exports */
import { fmtK } from '@/domain/format';
import {
  pfDecision, selectionStress, type PfStress, type Portfolio, type ProductStress, type StressStats, type VerdictGroup, type WaveStress,
} from '@/domain/portfolio';
import { VERDICT_META, type Verdict } from '@/domain/verdict';
import { esc } from '../render';

/** What the report prints of the last portfolio Monte Carlo for its scope (all values from the domain run and `pfDecision`). */
export interface StressReport {
  draws: number; seed: number; rho: number; stale: boolean;
  stats: StressStats;
  waves: WaveStress[]; products: ProductStress[];
  verdict: { verdict: Verdict; confidence: number } | null;
  reduction: number | null;
}

/**
 * The stress block of a scope: the portfolio (every wave and product), one wave or one unit (B10d: its products' draws added up, its own verdict and
 * risk reduction), all read from `selectionStress` and `pfDecision`; null without a run or when the scope has no product in it.
 */
export function stressReport(pf: Portfolio, scope: VerdictGroup, extra: { run: PfStress; stale: boolean } | null | undefined): StressReport | null {
  if (!extra) return null;
  const { run, stale } = extra, sel = selectionStress(run, scope, pf);
  if (!sel) return null;
  const d = pfDecision(pf, run, scope);
  return {
    draws: run.draws, seed: run.seed, rho: run.rho, stale, stats: sel.stats, waves: sel.waves, products: sel.products,
    verdict: d ? { verdict: d.verdict, confidence: d.confidence } : null, reduction: scope.kind === 'wave' ? null : sel.diversification.reduction,
  };
}

const cells = (s: StressStats): string[] => [fmtK(s.p10), fmtK(s.p50), fmtK(s.p90), fmtK(s.cvar10), `${Math.round(s.pNetNeg * 100)}%`];
const row = (name: string, s: StressStats): string => `<tr><td>${esc(name)}</td>${cells(s).map((x) => `<td style="text-align:right">${x}</td>`).join('')}</tr>`;

/** Section "Portfolio stress" of the portfolio report (empty string when no run exists). */
export function renderStress(r: StressReport | null, label: string): string {
  if (!r) return '';
  const v = r.verdict ? VERDICT_META[r.verdict.verdict] : null;
  return '<h2>7 · Portfolio stress</h2>'
    + `<p>Monte Carlo of the planned products, ${r.draws} draws per product, seed ${r.seed}, correlation between products ρ = ${r.rho}.${r.stale ? ' ' +
      '<strong>The portfolio changed after this run: the figures below are stale.</strong>' : ''}`
    + `${v && r.verdict ? ` Decision Intelligence verdict for ${esc(label)}: <strong>${esc(v.label)}</strong> (${r.verdict.confidence}% confidence).` : ''}`
    + `${r.reduction === null ? '' : ` Risk reduction against the products taken alone (P10): ${fmtK(r.reduction)}.`}</p>`
    + '<table><tr><th>Scope</th><th>P10</th><th>P50</th><th>P90</th><th>CVaR 10%</th><th>P(net &lt; 0)</th></tr>'
    + `${row(label, r.stats)}${r.waves.map((w) => row(`Wave ${w.name}`, w.stats)).join('')}${r.products.map((p) => row(`Product ${p.name}`, p.stats))
      .join('')}</table>`;
}
