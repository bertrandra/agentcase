import { expect } from 'vitest';
import { engineNow, makeCtx, model } from '@/domain';
import { resolveProduct, scheduledProducts, type Portfolio, type VScope } from '@/domain/portfolio';
import type { Live } from '@/domain/verifyA';
import { expectClose } from './portfolio';

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
export interface Ind { id: string; name: string; month0: number; live: Live }

/**
 * Independent derivation: the planned products of a selection, each with a live case built from its resolved case by a FRESH context (not the
 * consolidation's).
 */
export function independent(pf: Portfolio, scope: VScope): Ind[] {
  return scheduledProducts(pf).filter((s) => scope.kind === 'portfolio' || s.wave.id === scope.id).map((s) => {
    const c = makeCtx(resolveProduct(pf, s.product.id));
    return { id: s.product.id, name: s.product.name, month0: s.month0, live: { c, m: model(c), eng: engineNow(c) } };
  });
}

/** The scopes every aggregate is tested on: the Portfolio and each Wave. */
export const scopesOf = (pf: Portfolio): VScope[] => [{ kind: 'portfolio' }, ...pf.waves.map((w): VScope => ({ kind: 'wave', id: w.id }))];
export const scopeName = (s: VScope): string => (s.kind === 'portfolio' ? 'Portfolio' : `Wave ${s.id}`);

/** A calendar series of the selection rebuilt from the products' own Time Engine months shifted by month0, truncated at the horizon. */
export function shifted(inds: Ind[], horizon: number, pick: (r: ReturnType<Live['eng']['monthAt']>) => number, hold = false): number[] {
  const out = new Array<number>(horizon).fill(0);
  for (const p of inds) {
    const n = p.live.eng.horizonMonths;
    for (let t = 1; t <= n; t++) { const i = p.month0 + t - 1; if (i < horizon) out[i]! += pick(p.live.eng.monthAt(t)); }
    // a stock (`hold`) stays at its last value after the product's own horizon (lot 10)
    if (hold && n > 0) for (let i = Math.max(0, p.month0 + n); i < horizon; i++) out[i]! += pick(p.live.eng.monthAt(n));
  }
  return out;
}

export const expectCell = (got: unknown, want: number): void => { expect(typeof got).toBe('number'); expectClose(got as number, want); };
