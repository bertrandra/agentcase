import { LOCATIONS } from '../catalog';
import type { Ctx } from '../ctx';
import { locationMix } from '../location';
import type { StrategyDef, Weights } from './defs';
import type { StrategyRow } from './evaluate';

export type MetricKey = keyof Weights;
/** dir +1 = higher is better, -1 = lower is better. */
export const METRICS: { k: MetricKey; label: string; dir: 1 | -1; declared: boolean }[] = [
  { k: 'roi', label: 'ROI', dir: 1, declared: false }, { k: 'tco', label: 'TCO', dir: -1, declared: false },
  { k: 'payback', label: 'Payback', dir: -1, declared: false }, { k: 'aiCoverage', label: 'AI Coverage', dir: 1, declared: false },
  { k: 'humanSup', label: 'Human Supervision', dir: -1, declared: false }, { k: 'risk', label: 'Operational Risk', dir: -1, declared: true },
  { k: 'agility', label: 'Business Agility', dir: 1, declared: true },
];

const val = (r: StrategyRow, k: MetricKey): number | null => (k in r.computed ? (r.computed as unknown as Record<string, number | null>)[k] as number | null : (r.declared as Record<string, number>)[k] as number);
/** Value used for ranking: a missing payback is the worst (99 years), a missing ROI the worst possible. */
const raw = (r: StrategyRow, k: MetricKey): number => { const v = val(r, k); return v == null ? (k === 'payback' ? 99 : -1e9) : v; };

export interface Ranked { id: string; icon: string; label: string; norm: Record<MetricKey, number>; score: number; row: StrategyRow }

/** Direction-aware 0-100 min-max normalisation across the strategies per metric, then the weighted composite score, best first. */
export function stratNormalize(R: StrategyRow[], W: Weights): Ranked[] {
  const out: Ranked[] = R.map((r) => ({ id: r.id, icon: r.icon, label: r.label, norm: {} as Record<MetricKey, number>, score: 0, row: r }));
  METRICS.forEach((m) => {
    const vs = R.map((r) => raw(r, m.k)), finite = vs.filter((v) => v > -1e8);
    const lo = Math.min(...finite), hi = Math.max(...finite);
    vs.forEach((v, i) => {
      let sc: number;
      if (v <= -1e8) sc = 0;
      else if (hi === lo) sc = 50;
      else { sc = ((v - lo) / (hi - lo)) * 100; if (m.dir < 0) sc = 100 - sc; }
      (out[i] as Ranked).norm[m.k] = Math.round(sc);
    });
  });
  out.forEach((o) => {
    let sw = 0, acc = 0;
    (Object.keys(W) as MetricKey[]).forEach((k) => { sw += W[k]; acc += W[k] * o.norm[k]; });
    o.score = sw ? Math.round(acc / sw) : 0;
  });
  return out.sort((a, b) => b.score - a.score);
}

/** Best and worst value of a metric across the strategies (for the green/red highlighting). */
export function metricExtremes(R: StrategyRow[], m: (typeof METRICS)[number]) {
  const vs = R.map((r) => raw(r, m.k)), hi = Math.max(...vs), lo = Math.min(...vs);
  return { vals: vs, best: m.dir > 0 ? hi : lo, worst: m.dir > 0 ? lo : hi };
}
export const metricValue = val;

export interface LocSplitRow { id: string; icon: string; label: string; mode: 'asis' | 'custom' | 'inherit'; perLoc: Record<string, number>; byCls: Record<string, number>; tot: number }

/** TO-BE location split per strategy and its aggregate by class (Local / Nearshore / Offshore). */
export function strategyLocSplits(c: Ctx, defs: StrategyDef[]): LocSplitRow[] {
  const asis = locationMix(c.s).pct;
  return defs.map((S) => {
    const custom = S.locSplit && typeof S.locSplit === 'object';
    const src: Record<string, number> = custom ? (S.locSplit as Record<string, number>) : asis;
    const mode = S.locSplit === 'ASIS' ? 'asis' : custom ? 'custom' : 'inherit';
    const perLoc: Record<string, number> = {}, byCls: Record<string, number> = { Local: 0, Nearshore: 0, Offshore: 0 };
    let tot = 0;
    LOCATIONS.forEach((l) => { const v = +(src[l.name] as number) || 0; perLoc[l.name] = v; tot += v; });
    LOCATIONS.forEach((l) => { byCls[l.cls] = ((byCls[l.cls] as number) || 0) + (tot > 0 ? ((perLoc[l.name] as number) / tot) * 100 : 0); });
    return { id: S.id, icon: S.icon, label: S.label, mode, perLoc, byCls, tot };
  });
}
