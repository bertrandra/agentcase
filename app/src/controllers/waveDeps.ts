/** @calc-zone portfolio-consolidation */
import * as ops from '@/domain/portfolio';
import type { WaveDependency } from '@/domain/portfolio';
import { definePortfolioCommand } from '@/store/commands';
import { dispatchChecked } from './portfolioGuard';

const depCmd = definePortfolioCommand<{ id: string; dep: WaveDependency | null }>({
  type: 'wave.setDependency', label: (p) => (p.dep === null ? 'Clear wave dependency' : 'Set wave dependency'), 
  // typing the lag is one step; choosing another wave or milestone, or clearing, is a step of its own
  coalesceKey: (p) => (p.dep ? `wave.setDependency:${p.id}:${p.dep.waveId}:${p.dep.milestone}` : `wave.clearDependency:${p.id}`),
  apply: (pf, p) => ops.setWaveDependency(pf, p.id, p.dep),
});
const capCmd = definePortfolioCommand<{ n: number | null }>({
  type: 'portfolio.setMaxConcurrentSetups', label: (p) => (p.n ? `Allow at most ${p.n} product(s) in setup at the same time` : 'Remove the setup capacity limit'),
  coalesceKey: () => 'portfolio.setMaxConcurrentSetups', apply: (pf, p) => ops.setMaxConcurrentSetups(pf, p.n),
});

/**
 * Make wave `id` start after wave `dep.waveId` reaches `dep.milestone` ('start' or 'setupEnd') plus `dep.lagMonths`; null clears the dependency.
 * Refused (false, nothing changes) for an unknown wave, itself, or a choice that would close a cycle. One undoable step.
 */
export const setWaveDependency = (id: string, dep: WaveDependency | null): boolean => dispatchChecked(depCmd({ id, dep }));
/** Transformation-team capacity: at most `n` products in setup at the same time; null or 0 removes the limit. One undoable step. */
export const setMaxConcurrentSetups = (n: number | null): boolean => (n === null || (Number.isFinite(n) && n >= 0)) && dispatchChecked(capCmd({ n }));
