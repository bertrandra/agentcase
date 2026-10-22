import { assignWave } from '@/controllers/wave';
import type { BoardColumn } from '@/domain/portfolio';
import { toast } from '@/ui/uiState';

/** Key of a column in menus and drag data: its wave id, or this marker for "Non planifié". */
export const NONE = '__none__';
export const keyOf = (c: BoardColumn): string => c.id ?? NONE;

/** The column the product is in. */
export const columnOf = (cols: BoardColumn[], productId: string): BoardColumn | undefined => cols.find((c) => c.cards.some((k) => k.id === productId));

/** Move a product to a column of the board (a wave, or "Non planifié") through the undoable `wave.assign` command, and announce it in the live region. */
export function moveProduct(productId: string, name: string, from: BoardColumn | undefined, to: BoardColumn): boolean {
  if (from && from.id === to.id) { toast(`${name} est déjà dans ${to.name}`); return false; }
  const ok = assignWave(productId, to.id);
  toast(ok ? `${name} déplacé vers ${to.name}${to.id === null ? ' (exclu de la consolidation)' : ''} — Ctrl+Z pour annuler` : `Déplacement de ${name} refusé`);
  return ok;
}
