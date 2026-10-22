/** @calc-zone consolidation */
import * as ops from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { dispatchChecked, newId } from './portfolioGuard';

const addCmd = definePortfolioCommand<{ id: string; name: string; startMonth: number }>({
  type: 'wave.add', label: (p) => `Add wave "${p.name}"`, apply: (pf, p) => ops.addWave(pf, p),
});
const renameCmd = definePortfolioCommand<{ id: string; name: string }>({
  type: 'wave.rename', label: (p) => `Rename wave to "${p.name}"`, coalesceKey: (p) => `wave.rename:${p.id}`, apply: (pf, p) => ops.renameWave(pf, p.id, p.name),
});
const removeCmd = definePortfolioCommand<{ id: string }>({ type: 'wave.remove', label: () => 'Remove wave', apply: (pf, p) => ops.removeWave(pf, p.id) });
const reorderCmd = definePortfolioCommand<{ id: string; toIndex: number }>({
  type: 'wave.reorder', label: (p) => `Move wave to position ${p.toIndex + 1}`, apply: (pf, p) => ops.reorderWave(pf, p.id, p.toIndex),
});
const startCmd = definePortfolioCommand<{ id: string; startMonth: number }>({
  type: 'wave.setStart', label: (p) => `Start wave at month ${p.startMonth}`, coalesceKey: (p) => `wave.setStart:${p.id}`, apply: (pf, p) => ops.setWaveStart(pf, p.id, p.startMonth),
});
const noteCmd = definePortfolioCommand<{ id: string; note: string }>({
  type: 'wave.setNote', label: () => 'Edit wave note', coalesceKey: (p) => `wave.setNote:${p.id}`, apply: (pf, p) => ops.setWaveNote(pf, p.id, p.note),
});
const assignCmd = definePortfolioCommand<{ productId: string; waveId: string | null }>({
  type: 'wave.assign', label: (p) => (p.waveId === null ? 'Unassign product from its wave' : 'Assign product to a wave'), apply: (pf, p) => ops.assignWave(pf, p.productId, p.waveId),
});

const ids = (): string[] => { const pf = appStore().getState().portfolio; return [...pf.products.map((p) => p.id), ...pf.waves.map((w) => w.id)]; };

/** Add a wave starting at `startMonth` (0 = portfolio start). Returns its id. */
export function addWave(name?: string, startMonth = 0): string | null {
  const id = newId('w', ids());
  return dispatchChecked(addCmd({ id, name: name?.trim() || `Wave ${appStore().getState().portfolio.waves.length + 1}`, startMonth })) ? id : null;
}
export const renameWave = (id: string, name: string): boolean => dispatchChecked(renameCmd({ id, name }));
/** Remove a wave: its products become unplanned (they are kept). */
export const removeWave = (id: string): boolean => dispatchChecked(removeCmd({ id }));
export const reorderWave = (id: string, toIndex: number): boolean => dispatchChecked(reorderCmd({ id, toIndex }));
export const setWaveStart = (id: string, startMonth: number): boolean => dispatchChecked(startCmd({ id, startMonth }));
export const setWaveNote = (id: string, note: string): boolean => dispatchChecked(noteCmd({ id, note }));
/** Put a product in a wave (it leaves its previous one), or in none (null = unplanned, left out of the consolidation). */
export const assignWave = (productId: string, waveId: string | null): boolean => dispatchChecked(assignCmd({ productId, waveId }));
