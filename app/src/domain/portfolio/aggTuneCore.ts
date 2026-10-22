import type { Ctx } from '../ctx';
import type { CaseState } from '../types/state';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import type { Portfolio } from './types';

/** min / max / average of a figure over the products of a selection (n = how many products carry a value). */
export interface Spread { min: number; max: number; avg: number; n: number }

/** The spread of some figures; all zeros when there is none. Plain arithmetic mean: it describes the products, it is not a weighted consolidation. */
export function spreadOf(values: number[]): Spread {
  if (!values.length) return { min: 0, max: 0, avg: 0, n: 0 };
  return { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, v) => a + v, 0) / values.length, n: values.length };
}

/** A product of a selection with its effective case and engine context (`resolveProduct`), the common head of every "tune" aggregate line. */
export interface Member { id: string; name: string; wave: string; state: CaseState; ctx: Ctx }

/** The requested products (unknown ids ignored), in the order asked, each with its effective case. */
export function membersOf(pf: Portfolio, productIds: string[]): Member[] {
  const out: Member[] = [];
  for (const id of productIds) {
    const p = pf.products.find((x) => x.id === id);
    if (!p) continue;
    const state = resolveProduct(pf, id);
    out.push({ id, name: p.name, wave: pf.waves.find((w) => w.id === p.waveId)?.name ?? '', state, ctx: ctxOf(state) });
  }
  return out;
}

/** The common identity of a table line. */
export type Head = Pick<Member, 'id' | 'name' | 'wave'>;
export const headOf = (m: Member): Head => ({ id: m.id, name: m.name, wave: m.wave });
export const countOf = <T>(rows: T[], f: (r: T) => boolean): number => rows.filter(f).length;
