import { assignWave } from '@/controllers/wave';
import type { BoardColumn } from '@/domain/portfolio';
import { toast } from '@/ui/uiState';

/** Key of a column in menus and drag data: its wave id, or this marker for "Unscheduled". */
export const NONE = '__none__';
export const keyOf = (c: BoardColumn): string => c.id ?? NONE;

/** The column the product is in. */
export const columnOf = (cols: BoardColumn[], productId: string): BoardColumn | undefined => cols.find((c) => c.cards.some((k) => k.id === productId));

/** Move a product to a column of the board (a wave, or "Unscheduled") through the undoable `wave.assign` command, and announce it in the live region. */
export function moveProduct(productId: string, name: string, from: BoardColumn | undefined, to: BoardColumn): boolean {
  if (from && from.id === to.id) { toast(`${name} is already in ${to.name}`); return false; }
  const ok = assignWave(productId, to.id);
  toast(ok ? `${name} moved to ${to.name}${to.id === null ? ' (excluded from the consolidation)' : ''} — Ctrl+Z to undo` : `Moving ${name} refused`);
  return ok;
}
