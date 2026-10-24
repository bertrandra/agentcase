/** @calc-zone foundation */
import { useMemo, useRef, useSyncExternalStore } from 'react';
import { computeCase, makeCtx, type CaseState, type Ctx } from '@/domain';
import { structuralEqual } from './equal';
import { canRedo, canUndo } from './history';
import { appStore } from './instance';
import { productDocOf, useViewProductId } from './productView';
import type { Doc, HistoryEntry, PortfolioDoc } from './types';

const subscribe = (cb: () => void) => appStore().subscribe(cb);

/** Read a slice of the document (re-renders only when the selected value changes by identity). The active product's case, or the one of the enclosing `ProductViewContext`. */
export function useDoc<T>(select: (d: Doc) => T): T {
  const as = useViewProductId();   // inside a ProductViewContext: that product's resolved case instead of the active one (aggregate view)
  return useSyncExternalStore(subscribe, () => { const s = appStore().getState(); return select((as && productDocOf(s.portfolio, as)) || s.doc); });
}

export interface HistoryView { canUndo: boolean; canRedo: boolean; undo: HistoryEntry[]; redo: HistoryEntry[] }
export function useHistory(): HistoryView {
  const h = useSyncExternalStore(subscribe, () => appStore().getState().history);
  return useMemo(() => ({ canUndo: canUndo(h), canRedo: canRedo(h), undo: h.undo, redo: h.redo }), [h]);
}

/** Read a slice of the portfolio (products, waves, hub, active product, edit scope). The 79 case sections use `useDoc`/`useCtx` instead. */
export function usePortfolio<T>(select: (p: PortfolioDoc) => T): T {
  return useSyncExternalStore(subscribe, () => select(appStore().getState().portfolio));
}

const memo = new WeakMap<CaseState, ReturnType<typeof computeCase>>();
/** `computeCase` memoised per case identity (the active product's doc and a product's resolved case share it: a product is computed once). */
export function caseResultOf(c: CaseState): ReturnType<typeof computeCase> {
  let r = memo.get(c);
  if (!r) { r = computeCase(c); memo.set(c, r); }
  return r;
}
/** The full computed case (model, headline, payback, NPV, scope) of the current document, memoised per document identity. */
export function useCaseResult(): ReturnType<typeof computeCase> {
  return caseResultOf(useDoc((d) => d));
}

const ctxMemo = new WeakMap<Doc, Ctx>();
/** The engine context of a document, memoised per document identity (shared by `useCtx` and `useCtxSelector`). */
export function ctxOf(doc: Doc): Ctx {
  let c = ctxMemo.get(doc);
  if (!c) { c = makeCtx(doc); ctxMemo.set(doc, c); }
  return c;
}
/**
 * The engine context (inputs + working artefacts) of the current document, memoised per document identity. The component re-renders on EVERY edit
 * of the case: prefer `useCtxSelector` (or a derived hook built on it) when it shows only part of the case.
 */
export function useCtx(): Ctx {
  return ctxOf(useDoc((d) => d));
}

/**
 * A value derived from the current document that re-renders the component only when the value changes by `isEqual` (default: structural equality of
 * plain data). The derivation runs on every edit (it is what tells whether the value changed); the render, the children and the charts are skipped when
 * it did not. Inside a `ProductViewContext`, that product's case. `select` may be an inline function.
 */
export function useDocSelector<T>(select: (d: Doc) => T, isEqual: (a: T, b: T) => boolean = structuralEqual): T {
  const as = useViewProductId(), last = useRef<{ doc: Doc; select: (d: Doc) => T; value: T } | null>(null);
  const snapshot = (): T => {
    const s = appStore().getState(), doc = (as && productDocOf(s.portfolio, as)) || s.doc, l = last.current;
    if (l && l.doc === doc && l.select === select) return l.value;
    const next = select(doc), value = l && isEqual(l.value, next) ? l.value : next;
    last.current = { doc, select, value };
    return value;
  };
  return useSyncExternalStore(subscribe, snapshot);
}
/** `useDocSelector` over the whole portfolio (the aggregate views): re-renders only when the selected value changes by `isEqual`. */
export function usePortfolioSelector<T>(select: (p: PortfolioDoc) => T, isEqual: (a: T, b: T) => boolean = structuralEqual): T {
  const last = useRef<{ p: PortfolioDoc; select: (p: PortfolioDoc) => T; value: T } | null>(null);
  return useSyncExternalStore(subscribe, () => {
    const p = appStore().getState().portfolio, l = last.current;
    if (l && l.p === p && l.select === select) return l.value;
    const next = select(p), value = l && isEqual(l.value, next) ? l.value : next;
    last.current = { p, select, value };
    return value;
  });
}
/** `useDocSelector` over the engine context: `useCtxSelector((c) => scenarioSet(c))` re-renders only when the scenarios change. */
export function useCtxSelector<T>(select: (c: Ctx) => T, isEqual: (a: T, b: T) => boolean = structuralEqual): T {
  const bySelect = useRef<{ select: (c: Ctx) => T; of: (d: Doc) => T } | null>(null);
  if (!bySelect.current || bySelect.current.select !== select) bySelect.current = { select, of: (d: Doc) => select(ctxOf(d)) };
  return useDocSelector(bySelect.current.of, isEqual);
}
