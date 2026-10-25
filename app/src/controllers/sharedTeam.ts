/** @calc-zone product-resolution */
import { FTE_STEP } from '@/domain/baseline/apportion';
import * as ops from '@/domain/portfolio';
import type { SharedLineField, SharedTeamLine } from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { dispatchChecked, newId } from './portfolioGuard';

const addCmd = definePortfolioCommand<{ line: SharedTeamLine }>({
  type: 'sharedTeam.add', label: (p) => `Add a shared team line (${p.line.skill})`, apply: (pf, p) => ops.addSharedLine(pf, p.line),
});
const editCmd = definePortfolioCommand<{ id: string; field: SharedLineField; value: string | number }>({
  type: 'sharedTeam.edit', label: (p) => `Change shared team line: ${p.field}`, coalesceKey: (p) => `sharedTeam.edit:${p.id}:${p.field}`,
  apply: (pf, p) => ops.editSharedLine(pf, p.id, p.field, p.value),
});
const removeCmd = definePortfolioCommand<{ id: string }>({
  type: 'sharedTeam.remove', label: () => 'Remove a shared team line', apply: (pf, p) => ops.removeSharedLine(pf, p.id),
});
const shareCmd = definePortfolioCommand<{ id: string; productId: string; pct: number }>({
  type: 'sharedTeam.setShare', label: (p) => `Set a product's share of a shared team line to ${p.pct} %`,
  coalesceKey: (p) => `sharedTeam.setShare:${p.id}:${p.productId}`, apply: (pf, p) => ops.setSharedAllocation(pf, p.id, p.productId, p.pct),
});

/**
 * Add a team line shared between products (default: one Dev B1 France FTE), with optional shares in percent per product id. Returns its id, or
 * null when refused. One undoable step.
 */
export function addSharedLine(row: Partial<Omit<SharedTeamLine, 'id'>> = {}): string | null {
  const id = newId('s', (appStore().getState().portfolio.sharedTeam ?? []).map((l) => l.id));
  const line: SharedTeamLine = { skill: 'Dev', grade: 'B1', loc: 'France', etp: FTE_STEP, allocations: {}, ...row, id };
  return dispatchChecked(addCmd({ line })) ? id : null;
}
/** Change the skill, grade, location or FTE (>= 0) of a shared line. */
export const updateSharedLine = (id: string, field: SharedLineField, value: string | number): boolean => dispatchChecked(editCmd({ id, field, value }));
/** Remove a shared line: every product loses its share of it. */
export const removeSharedLine = (id: string): boolean => dispatchChecked(removeCmd({ id }));
/** A product's share of a shared line, in percent 0..100 (0 = no share). Shares adding up to more than 100 % are accepted and flagged (diagnostic). */
export const setSharedShare = (id: string, productId: string, pct: number): boolean => dispatchChecked(shareCmd({ id, productId, pct }));
