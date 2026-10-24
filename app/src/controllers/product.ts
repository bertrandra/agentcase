/** @calc-zone product-resolution */
import { FTE_STEP } from '@/domain/baseline/apportion';
import * as ops from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { EditScope } from '@/store/types';
import { dispatchChecked, newId } from './portfolioGuard';

const addCmd = definePortfolioCommand<{ id: string; name: string; waveId: string | null }>({
  type: 'product.add', label: (p) => `Add product "${p.name}"`,
  apply: (pf, p) => ops.addProduct(pf, { id: p.id, name: p.name, waveId: p.waveId, teamIn: [{ skill: 'Dev', grade: 'B1', loc: 'France', etp: FTE_STEP, pins: [] }] }),
});
const renameCmd = definePortfolioCommand<{ id: string; name: string }>({
  type: 'product.rename', label: (p) => `Rename product to "${p.name}"`, coalesceKey: (p) => `product.rename:${p.id}`, apply: (pf, p) => ops.renameProduct(pf, p.id, p.name),
});
const duplicateCmd = definePortfolioCommand<{ id: string; copyId: string; name?: string }>({
  type: 'product.duplicate', label: (p) => `Duplicate product ${p.name ?? p.id}`, apply: (pf, p) => ops.duplicateProduct(pf, p.id, p.copyId, p.name),
});
const archiveCmd = definePortfolioCommand<{ id: string; archived: boolean }>({
  type: 'product.archive', label: (p) => `${p.archived ? 'Archive' : 'Restore'} product`, apply: (pf, p) => ops.archiveProduct(pf, p.id, p.archived),
});
const removeCmd = definePortfolioCommand<{ id: string }>({ type: 'product.remove', label: () => 'Remove product', apply: (pf, p) => ops.removeProduct(pf, p.id) });
const noteCmd = definePortfolioCommand<{ id: string; note: string }>({
  type: 'product.setNote', label: () => 'Edit product note', coalesceKey: (p) => `product.setNote:${p.id}`, apply: (pf, p) => ops.setProductNote(pf, p.id, p.note),
});
const offsetCmd = definePortfolioCommand<{ id: string; months: number }>({
  type: 'product.setOffset', label: (p) => `Offset product by ${p.months} months`, coalesceKey: (p) => `product.setOffset:${p.id}`, apply: (pf, p) => ops.setProductOffset(pf, p.id, p.months),
});
/** View state, not a document change: no undo step (D-M6). The active product is saved with the file. */
const activeCmd = definePortfolioCommand<{ id: string }>({
  type: 'product.setActive', label: () => 'Switch active product', undoable: false, apply: (pf, p) => ops.setActive(pf, p.id),
});
/** "Edit: all products / this product only". Transient: never saved, never undone. */
const scopeCmd = definePortfolioCommand<{ scope: EditScope }>({
  type: 'product.setEditScope', label: () => 'Set edit scope', undoable: false, apply: (pf, p) => (pf.editScope === p.scope ? pf : { ...pf, editScope: p.scope }),
});

const ids = (): string[] => { const pf = appStore().getState().portfolio; return [...pf.products.map((p) => p.id), ...pf.waves.map((w) => w.id)]; };

/** Add a product that inherits the common values (new default team row). Returns its id, or null beyond 50 products. */
export function addProduct(name?: string, waveId: string | null = null): string | null {
  const pf = appStore().getState().portfolio, id = newId('p', ids());
  return dispatchChecked(addCmd({ id, name: name?.trim() || `Product ${pf.products.length + 1}`, waveId })) ? id : null;
}
export const renameProduct = (id: string, name: string): boolean => dispatchChecked(renameCmd({ id, name }));
export function duplicateProduct(id: string, name?: string): string | null {
  const copyId = newId('p', ids());
  return dispatchChecked(duplicateCmd({ id, copyId, name })) ? copyId : null;
}
export const archiveProduct = (id: string, archived = true): boolean => dispatchChecked(archiveCmd({ id, archived }));
/** Remove a product (it leaves its wave). The last product cannot be removed: returns false. */
export const removeProduct = (id: string): boolean => dispatchChecked(removeCmd({ id }));
export const setProductNote = (id: string, note: string): boolean => dispatchChecked(noteCmd({ id, note }));
export const setProductOffset = (id: string, months: number): boolean => dispatchChecked(offsetCmd({ id, months }));
export const setActiveProduct = (id: string): boolean => dispatchChecked(activeCmd({ id }));
export const setEditScope = (scope: EditScope): boolean => dispatchChecked(scopeCmd({ scope }));

/**
 * The top-bar "Edit" dropdown: 'all' = All products (shared data goes to the common values; the entry team stays the active product's), or a product
 * id = that product becomes the active one and its edits create overrides ("<name> only"). View state: no undo step; the View is left as it is.
 * True when something changed; false for an unknown product or the current choice.
 */
export function chooseEditTarget(target: string): boolean {
  if (target === 'all') return setEditScope('all');
  if (!appStore().getState().portfolio.products.some((p) => p.id === target)) return false;
  const moved = setActiveProduct(target);
  return setEditScope('product') || moved;
}
