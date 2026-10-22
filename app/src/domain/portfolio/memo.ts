import { makeCtx, type Ctx } from '../ctx';
import type { CaseState } from '../types/state';

type Level = WeakMap<object, unknown>;
const LEAVES = {};

/** Memo over a chain of object identities plus a small string key: rebuilt only when one of the objects is a new one. */
export function memoChain<V>(root: Level, keys: object[], leaf: string, build: () => V): V {
  let m = root;
  for (const k of keys) {
    let next = m.get(k) as Level | undefined;
    if (!next) { next = new WeakMap(); m.set(k, next); }
    m = next;
  }
  let leaves = m.get(LEAVES) as Map<string, V> | undefined;
  if (!leaves) { leaves = new Map(); m.set(LEAVES, leaves); }
  let v = leaves.get(leaf);
  if (v === undefined) { v = build(); leaves.set(leaf, v); }
  return v;
}

const ctxs = new WeakMap<CaseState, Ctx>();
/** One Ctx per resolved case identity. */
export function ctxOf(s: CaseState): Ctx {
  let c = ctxs.get(s);
  if (!c) { c = makeCtx(s); ctxs.set(s, c); }
  return c;
}
