import type { Patch } from 'immer';
import type { CaseState } from '@/domain';

/** The undoable document = the legacy snapshot state (all registry keys); unknown keys are carried through untouched. */
export type Doc = CaseState & { [key: string]: unknown };

/** A reversible unit of intent. `run` mutates an Immer draft; patches (and their inverses) come for free. */
export interface Command<P = unknown> {
  type: string;
  payload: P;
  label: string;
  /** consecutive commands with the same key within the coalescing window become one history step */
  coalesceKey?: string;
  /** false: applied but never put on the undo stack (navigation-like changes) */
  undoable: boolean;
  run(draft: Doc, payload: P): void;
}

export interface HistoryEntry {
  label: string;
  type: string;
  ts: number;
  coalesceKey?: string;
  patches: Patch[];
  inverse: Patch[];
}

export interface HistoryState { undo: HistoryEntry[]; redo: HistoryEntry[] }
export interface AuditRecord { ts: number; type: string; label: string; kind: 'do' | 'undo' | 'redo' | 'remote' | 'load' }
