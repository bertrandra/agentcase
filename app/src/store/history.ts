import type { Patch } from 'immer';
import type { HistoryEntry, HistoryState } from './types';

export const EMPTY_HISTORY: HistoryState = { undo: [], redo: [] };
export const COALESCE_MS = 800;
export const HISTORY_CAP = 200;

/** Push a new step; merge into the previous one when the coalescing key matches inside the window; a new step clears redo. */
export function pushEntry(h: HistoryState, e: HistoryEntry, windowMs = COALESCE_MS, cap = HISTORY_CAP): HistoryState {
  const last = h.undo[h.undo.length - 1];
  if (last && e.coalesceKey && last.coalesceKey === e.coalesceKey && e.ts - last.ts <= windowMs) {
    const merged: HistoryEntry = { ...last, ts: e.ts, label: e.label, patches: [...last.patches, ...e.patches], inverse: [...e.inverse, ...last.inverse] };
    return { undo: [...h.undo.slice(0, -1), merged], redo: [] };
  }
  const undo = [...h.undo, e];
  return { undo: undo.length > cap ? undo.slice(undo.length - cap) : undo, redo: [] };
}

/**
 * Does a change (from another tab) invalidate this tab's undo / redo? Their patches address products and waves BY POSITION (`['products', 2, …]`)
 * and a wave's members by position: a change that adds, removes, replaces or reorders products or waves, or a wave's members, moves those positions.
 */
export const invalidatesHistory = (ps: Patch[]): boolean =>
  ps.some((p) => (p.path[0] === 'products' || p.path[0] === 'waves') && (p.path.length <= 2 || p.path[2] === 'productIds'));

export const canUndo =(h: HistoryState): boolean => h.undo.length > 0;
export const canRedo = (h: HistoryState): boolean => h.redo.length > 0;

/** Move the last undo step to the redo stack. */
export function popUndo(h: HistoryState): { entry: HistoryEntry; next: HistoryState } | null {
  const entry = h.undo[h.undo.length - 1];
  return entry ? { entry, next: { undo: h.undo.slice(0, -1), redo: [...h.redo, entry] } } : null;
}

/** Move the last redo step back to the undo stack. */
export function popRedo(h: HistoryState): { entry: HistoryEntry; next: HistoryState } | null {
  const entry = h.redo[h.redo.length - 1];
  return entry ? { entry, next: { undo: [...h.undo, entry], redo: h.redo.slice(0, -1) } } : null;
}
