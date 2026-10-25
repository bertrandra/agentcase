/** @calc-zone product-resolution */
import { caseDiscountRate, engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { costReduction } from '../economics/costReduction';
import { headlineOf, type Headline } from '../economics/headline';
import { khSetupCost } from '../knowledge';
import { model } from '../model/overlay';
import { horizonYears } from '../model/horizonYears';
import type { Engine } from '../time';
import type { MonthRow } from '../time/rows';
import type { CaseState } from '../types/state';
import { velocityUpliftPct } from '../verifyB/velocityUplift';
import { ctxOf } from './memo';

const lazy = <T>(f: () => T): (() => T) => { let v: T | undefined; return () => (v ??= f()); };

/** One product's single-case computation, built once per resolved-case identity from the existing Time Engine (no formula of its own). */
export interface ProductRun {
  ctx: Ctx;
  engine: Engine;
  /** the engine's monthly rows, t = 1..N */
  rows: MonthRow[];
  baseEtp: number;
  /** knowledge-transfer part of the setup (already inside the engine's setup rows), spread like them over `profile` months */
  ktSetup: number;
  profile: number;
  rate: number;
  velocityPct: () => number;
  /** effective automation % and glass ceiling % of the product (the headline bar's two figures) */
  automation: () => { eff: number; ceiling: number };
  /** the product's own headline: NPV discounted from its own month 0 */
  headline: () => Headline;
  /** last horizon year as `computeCase().endYear` reports it */
  endYear: () => { savings: number; run: number; index: number };
  /** cost-reduction basis over the product's horizon: baseline cost, savings and setup */
  cost: () => { years: number; base: number; sav: number; setup: number };
}

const runs = new WeakMap<CaseState, ProductRun>();
export const runStats = { builds: 0 };

export function runOf(s: CaseState): ProductRun {
  let r = runs.get(s);
  if (r) return r;
  runStats.builds++;
  const ctx = ctxOf(s), engine = engineNow(ctx), K = engine.K;
  r = {
    ctx, engine, rows: engine.months(), baseEtp: K.baseEtp, ktSetup: khSetupCost(ctx), profile: K.setupProfileMonths, rate: caseDiscountRate(ctx),
    velocityPct: lazy(() => velocityUpliftPct(ctx)),
    automation: lazy(() => { const m = model(ctx); return { eff: m.eff, ceiling: m.ceiling }; }),
    headline: lazy(() => headlineOf(engine, ctx)),
    endYear: lazy(() => {
      const hy = horizonYears(ctx), last = hy.sav.length - 1;
      return { savings: hy.sav[last] ?? 0, run: hy.run[last] ?? 0, index: last + 1 };
    }),
    cost: lazy(() => { const c = costReduction(ctx); return { years: c.years, base: c.base, sav: c.ok ? c.gross * c.base : 0, setup: c.setup }; }),
  };
  runs.set(s, r);
  return r;
}
