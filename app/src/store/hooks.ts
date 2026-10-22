/** @calc-zone foundation */
import { useMemo, useSyncExternalStore } from 'react';
import { computeCase, makeCtx, type CaseState, type Ctx } from '@/domain';
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
/** The engine context (inputs + working artefacts) of the current document, memoised per document identity. */
export function useCtx(): Ctx {
  const doc = useDoc((d) => d);
  let c = ctxMemo.get(doc);
  if (!c) { c = makeCtx(doc); ctxMemo.set(doc, c); }
  return c;
}
