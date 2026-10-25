/** @calc-zone stress */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { headlineOf } from '../economics/headline';
import { MC_PARAMS_DEFAULT } from './mcParams';
import { autoTechCap, withInputs } from './withInputs';

/**
 * Driver sensitivity (tornado): each driver of the Monte Carlo (the uncertain form inputs) moved down and up by the same relative step, the case
 * rerun on its own Time Engine, net and NPV read from the one headline owner. Pure; the portfolio version (`portfolioSensitivity`) runs the same
 * moved cases of every product and sums them through the consolidation kernel.
 */
export interface TornadoDriver { id: string; label: string; min: number; max: number }
/** The drivers: the Monte Carlo's uncertain inputs, with their valid ranges (the same list for every product). */
export const TORNADO_DRIVERS: readonly TornadoDriver[] = MC_PARAMS_DEFAULT.map((p) => ({ id: p.id, label: p.label.replace(/ \((pts|%)\)$/, ''),
  min: p.min, max: p.max }));
/** Relative steps offered, in percent of the driver's value. */
export const TORNADO_STEPS: readonly number[] = [5, 10, 20];
export const TORNADO_DEFAULT_STEP = 10;

export interface TornadoFigures { net: number; npv: number }
export interface TornadoRow {
  id: string; label: string;
  /** driver value of the case, then moved down and up by the step (clamped to its range) */
  value: number; low: number; high: number;
  down: TornadoFigures; up: TornadoFigures;
  /** |net up − net down| */
  swing: number;
}
export interface Tornado { step: number; base: TornadoFigures; rows: TornadoRow[] }

/** The driver's value of a case moved by `dir` × `step` % of itself, clamped to its range (automation also to the technical cap, like the draws). */
export function movedValue(c: Ctx, d: TornadoDriver, dir: -1 | 1, step: number): number {
  const v = parseFloat(c.inp.v(d.id)) || 0, hi = d.id === 'autoPotential' ? autoTechCap(c) : d.max;
  return Math.max(d.min, Math.min(hi, v * (1 + (dir * step) / 100)));
}
/** The case with one driver moved (the other inputs untouched). */
export const movedCtx = (c: Ctx, d: TornadoDriver, dir: -1 | 1, step: number): Ctx => withInputs(c, { [d.id]: String(movedValue(c, d, dir, step)) });

/** One row per driver, ranked by swing (largest first; ties keep the driver order). */
export function rankTornado<R extends { swing: number }>(rows: R[]): R[] {
  return rows.map((r, i) => ({ r, i })).sort((a, b) => b.r.swing - a.r.swing || a.i - b.i).map((x) => x.r);
}
export const tornadoRow = (c: Ctx, d: TornadoDriver, step: number, down: TornadoFigures, up: TornadoFigures): TornadoRow => ({
  id: d.id, label: d.label, value: parseFloat(c.inp.v(d.id)) || 0, low: movedValue(c, d, -1, step), high: movedValue(c, d, 1, step), down, up,
  swing: Math.abs(up.net - down.net),
});

const fig = (c: Ctx): TornadoFigures => { const h = headlineOf(engineNow(c), c); return { net: h.net, npv: h.npv }; };

/** The product's own tornado: net and NPV over its horizon (NPV from its month 0 at the case discount rate). */
export function productTornado(c: Ctx, step: number = TORNADO_DEFAULT_STEP): Tornado {
  const rows = TORNADO_DRIVERS.map((d) => tornadoRow(c, d, step, fig(movedCtx(c, d, -1, step)), fig(movedCtx(c, d, 1, step))));
  return { step, base: fig(c), rows: rankTornado(rows) };
}
