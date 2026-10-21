import { useMemo, useSyncExternalStore } from 'react';
import { computeCase, makeCtx, type Ctx } from '@/domain';
import { canRedo, canUndo } from './history';
import { appStore } from './instance';
import type { Doc, HistoryEntry } from './types';

const subscribe = (cb: () => void) => appStore().subscribe(cb);

/** Read a slice of the document (re-renders only when the selected value changes by identity). */
export function useDoc<T>(select: (d: Doc) => T): T {
  return useSyncExternalStore(subscribe, () => select(appStore().getState().doc));
}

export interface HistoryView { canUndo: boolean; canRedo: boolean; undo: HistoryEntry[]; redo: HistoryEntry[] }
export function useHistory(): HistoryView {
  const h = useSyncExternalStore(subscribe, () => appStore().getState().history);
  return useMemo(() => ({ canUndo: canUndo(h), canRedo: canRedo(h), undo: h.undo, redo: h.redo }), [h]);
}

const memo = new WeakMap<Doc, ReturnType<typeof computeCase>>();
/** The full computed case (model, headline, payback, NPV, scope) of the current document, memoised per document identity. */
export function useCaseResult(): ReturnType<typeof computeCase> {
  const doc = useDoc((d) => d);
  let r = memo.get(doc);
  if (!r) { r = computeCase(doc); memo.set(doc, r); }
  return r;
}

const ctxMemo = new WeakMap<Doc, Ctx>();
/** The engine context (inputs + working artefacts) of the current document, memoised per document identity. */
export function useCtx(): Ctx {
  const doc = useDoc((d) => d);
  let c = ctxMemo.get(doc);
  if (!c) { c = makeCtx(doc); ctxMemo.set(doc, c); }
  return c;
}
