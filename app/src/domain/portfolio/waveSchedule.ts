/** @calc-zone portfolio-consolidation */
import type { Issue } from './validate';
import type { Portfolio, Product, Wave } from './types';

/**
 * The effective calendar of the waves and products (SPEC_MULTI_PRODUIT F13): the ONE place where wave dependencies and the transformation-team
 * capacity move a start. Pure: the setup length of a product (its own months of setup) is asked of `setupMonths`, and only when a dependency on
 * `setupEnd` or a capacity needs it. Without a dependency and without a capacity, every month0 is `wave start + offset`, as before.
 */
export interface WaveSchedule {
  /** effective start month of each wave: max(own start, dependency-derived start) */
  starts: Map<string, number>;
  /** month 0 of each planned product: effective wave start + offset, then pushed back by the capacity */
  month0: Map<string, number>;
  /** months each planned product was pushed back by the capacity (only products actually pushed) */
  pushed: Map<string, number>;
  /** dependency ignored (cycle, unknown wave), wave delayed by its dependency, product pushed by the capacity */
  notes: Issue[];
}

/** Diagnostic codes of the schedule (shown with the consolidation and wave diagnostics). */
export const SCHEDULE_LABELS: Readonly<Record<string, string>> = {
  'wave-delayed': 'Wave delayed by its dependency', 'setup-pushed': 'Setup pushed back (capacity)', 'wave-dep-cycle': 'Dependency cycle',
  'wave-dep-unknown': 'Unknown wave',
};
export const SCHEDULE_CODES: readonly string[] = Object.keys(SCHEDULE_LABELS);

export const whole = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0);
const MILESTONE = { start: 'starts', setupEnd: 'finishes the setup of its last product' } as const;

/** Waves whose dependency chain comes back to them. Each wave has at most one dependency, so following the chain from each wave is enough. */
export function cyclicWaves(waves: readonly Wave[]): Set<string> {
  const next = new Map(waves.map((w) => [w.id, w.dependsOn?.waveId])), out = new Set<string>();
  for (const w of waves) {
    const path: string[] = [];
    let at: string | undefined = w.id;
    while (at !== undefined && next.has(at) && !path.includes(at) && !out.has(at)) { path.push(at); at = next.get(at); }
    if (at !== undefined && path.includes(at)) path.slice(path.indexOf(at)).forEach((id) => out.add(id));
  }
  return out;
}

/** Planned products of a wave, in the wave's own order (the board order). */
const plannedOf = (pf: Portfolio, w: Wave): Product[] => {
  const mine = pf.products.filter((p) => !p.archived && p.waveId === w.id), at = (p: Product) => w.productIds.indexOf(p.id);
  return mine.map((p, i) => ({ p, i })).sort((a, b) => (at(a.p) < 0 ? 1e9 : at(a.p)) - (at(b.p) < 0 ? 1e9 : at(b.p)) || a.i - b.i).map((x) => x.p);
};

/** The capacity: integer >= 1, or null (no limit). */
export const capacityOf = (pf: Portfolio): number | null =>
  Number.isFinite(pf.maxConcurrentSetups) && (pf.maxConcurrentSetups as number) >= 1 ? Math.floor(pf.maxConcurrentSetups as number) : null;

/**
 * Resolve the calendar. Order of placement: wave order, except that a wave comes after the wave it depends on; inside a wave, the wave's product order.
 * The capacity is greedy in that order: a product starts at the first month >= its planned month0 where fewer than `cap` setups already placed overlap
 * its own setup months [month0, month0 + setup). A cycle is never followed: the dependencies of the waves on it are ignored (diagnostic).
 */
export function resolveSchedule(pf: Portfolio, setupMonths: (productId: string) => number): WaveSchedule {
  const out: WaveSchedule = { starts: new Map(), month0: new Map(), pushed: new Map(), notes: [] };
  const cap = capacityOf(pf), cyclic = cyclicWaves(pf.waves), byId = new Map(pf.waves.map((w) => [w.id, w]));
  const memo = new Map<string, number>(), setup = (id: string) => memo.get(id) ?? memo.set(id, whole(setupMonths(id))).get(id)!;
  const placed: { from: number; to: number }[] = [], setupEnd = new Map<string, number>();
  const edge = (w: Wave): Wave | undefined => {
    const d = w.dependsOn;
    if (!d) return undefined;
    if (cyclic.has(w.id)) { out.notes.push({ code: 'wave-dep-cycle', message: `${w.name}: its dependency on another wave forms a cycle — ignored`, waveId: w.id }); return undefined; }
    const x = byId.get(d.waveId);
    if (!x) out.notes.push({ code: 'wave-dep-unknown', message: `${w.name}: depends on an unknown wave (${d.waveId}) — ignored`, waveId: w.id });
    return x;
  };
  const edges = new Map(pf.waves.map((w) => [w.id, edge(w)]));
  const pending = [...pf.waves];
  while (pending.length) {
    const i = pending.findIndex((w) => { const x = edges.get(w.id); return !x || out.starts.has(x.id); });
    const w = pending.splice(i < 0 ? 0 : i, 1)[0] as Wave, x = edges.get(w.id), own = whole(w.startMonth);
    let start = own;
    if (x && w.dependsOn) {
      const anchor = w.dependsOn.milestone === 'setupEnd' ? (setupEnd.get(x.id) ?? out.starts.get(x.id) ?? 0) : (out.starts.get(x.id) ?? 0);
      const derived = anchor + whole(w.dependsOn.lagMonths);
      if (derived > own) {
        start = derived;
        out.notes.push({ code: 'wave-delayed', waveId: w.id, message: `${w.name}: starts at month ${derived} instead of ${own} — after ${x.name} ${
          MILESTONE[w.dependsOn.milestone]}${w.dependsOn.lagMonths ? ` + ${whole(w.dependsOn.lagMonths)} month(s)` : ''}` });
      }
    }
    out.starts.set(w.id, start);
    for (const p of plannedOf(pf, w)) {
      const want = start + whole(p.offsetMonths), needEnd = cap !== null || dependsOnEnd(pf, w.id);
      let m = want;
      if (cap !== null) {
        const d = Math.max(1, setup(p.id));
        while (placed.filter((s) => s.from < m + d && m < s.to).length >= cap) m++;
        placed.push({ from: m, to: m + d });
      }
      if (m > want) {
        out.pushed.set(p.id, m - want);
        out.notes.push({ code: 'setup-pushed', productId: p.id, waveId: w.id,
          message: `${p.name}: setup pushed back ${m - want} month(s), to month ${m} — at most ${cap} product(s) in setup at the same time` });
      }
      out.month0.set(p.id, m);
      if (needEnd) setupEnd.set(w.id, Math.max(setupEnd.get(w.id) ?? 0, m + setup(p.id)));
    }
  }
  return out;
}

/** Does any wave wait for the end of the setup of wave `id`? */
const dependsOnEnd = (pf: Portfolio, id: string): boolean => pf.waves.some((w) => w.dependsOn?.waveId === id && w.dependsOn.milestone === 'setupEnd');

/** "after Wave 1 starts + 2 months" / "after Wave 1 finishes setup": the dependency in words, or null when the wave has none (or it names no wave). */
export function dependencyLabel(pf: Portfolio, w: Wave): string | null {
  const d = w.dependsOn, x = d ? pf.waves.find((v) => v.id === d.waveId) : undefined;
  if (!d || !x) return null;
  const lag = whole(d.lagMonths);
  return `after ${x.name} ${d.milestone === 'setupEnd' ? 'finishes setup' : 'starts'}${lag ? ` + ${lag} month${lag > 1 ? 's' : ''}` : ''}`;
}
