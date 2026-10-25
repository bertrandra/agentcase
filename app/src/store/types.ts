import type { Patch } from 'immer';
import type { CaseState } from '@/domain';
import type { DisplayScope, Portfolio } from '@/domain/portfolio';

/** The undoable document = the legacy snapshot state (all registry keys); unknown keys are carried through untouched. */
export type Doc = CaseState & { [key: string]: unknown };

/** Which products an edit of a shareable key reaches: the common values (all products) or the active product's overrides only. */
export type EditScope = 'all' | 'product';

/**
 * The store's source of truth: the portfolio (common values, products, waves, hub). `editScope` and `displayScope` (Portfolio / Wave X / Product
 * actif, top bar) are transient view fields: never saved, never undone and never broadcast (like `activeProductId`, which IS saved but also stays out
 * of the history). `persona`, the tab's current persona (D3), is view state too: never undone nor broadcast; a file stores it only as the persona it
 * opens on (`store/persona.ts`).
 */
export type PortfolioDoc = Portfolio & { editScope?: EditScope; displayScope?: DisplayScope; persona?: string };

/** Fields of the portfolio that are view state: changing them is not a document change for other tabs. */
export const VIEW_FIELDS: readonly string[] = ['activeProductId', 'editScope', 'displayScope', 'persona'];

/** A reversible unit of intent. `run` mutates an Immer draft; patches (and their inverses) come for free. */
export interface Command<P = unknown> {
  type: string;
  payload: P;
  label: string;
  /** consecutive commands with the same key within the coalescing window become one history step */
  coalesceKey?: string;
  /** false: applied but never put on the undo stack (navigation-like changes) */
  undoable: boolean;
  /** case commands: `run` mutates the ACTIVE PRODUCT'S effective case; the address layer maps each change to the portfolio */
  run(draft: Doc, payload: P): void;
  /** portfolio commands (products, waves, hub, overrides): mutate the portfolio itself; `run` is then a no-op */
  runPortfolio?(draft: PortfolioDoc, payload: P): void;
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
