/** @calc-zone stress */
import { useMemo, useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import { pfDecision, pfStressFingerprint, scopeKey, type PfStress, type VerdictGroup } from '@/domain/portfolio';
import type { Decision } from '@/domain/verdict';
import { mcDrawsOf, mcSeedOf } from '@/domain/stress';
import { useCorePortfolio, useDisplayScope } from './consolidationHooks';
import { useCtx, usePortfolio } from './hooks';
import { useIsMulti } from './portfolioHooks';

/** Draws and seed of the next portfolio run (view state: neither saved nor undoable, like the single-case inputs they mirror). */
export interface PfSimParams { draws: number; seed: number }

/**
 * The last portfolio Monte Carlo and the progress of the one in flight (0..1, null when idle). Derived data, kept out of the undoable
 * document like `simStore`: the distribution is recomputed, never restored, and a run carries the fingerprint of what it was made on.
 */
export const pfSimStore = createStore<{ run: PfStress | null; progress: number | null;
  params: PfSimParams | null }>(() => ({ run: null, progress: null, params: null }));

export interface PortfolioSimulation { run: PfStress | null; stale: boolean; progress: number | null; rho: number }

/** The last portfolio run, whether the portfolio (a product, a wave, the correlation) moved since, and the progress of a run in flight. */
export function usePortfolioSimulation(): PortfolioSimulation {
  const run = useSyncExternalStore(pfSimStore.subscribe, () => pfSimStore.getState().run);
  const progress = useSyncExternalStore(pfSimStore.subscribe, () => pfSimStore.getState().progress);
  const core = useCorePortfolio(), rho = usePortfolio((p) => p.rho ?? 0);
  const live = useMemo(() => (run ? pfStressFingerprint(core, rho) : 0), [run, core, rho]);
  return useMemo(() => ({ run, stale: !!run && run.fingerprint !== live, progress, rho }), [run, live, progress, rho]);
}

/**
 * The group a verdict speaks for: the portfolio, a wave, or a unit of the organisation tree (F-B81). A unit has its consolidated figures (B10b) but
 * not yet its own Monte Carlo verdict (strategy per unit, D-B40, phase B10d): `usePortfolioDecision` gives null for it and the screens say
 * "not available at the unit scope".
 */
export type ScopeGroup = VerdictGroup | { kind: 'unit'; id: string };

/** Where a display scope other than the active product points; null for the product scope. */
export const groupOf = (s: ReturnType<typeof useDisplayScope>): ScopeGroup | null => (s.kind === 'product' ? null : s);

/** The verdict of a group of products from the last portfolio run, null without a run (or for a wave with no planned product, or a unit). */
export function usePortfolioDecision(group: ScopeGroup | null): Decision | null {
  const core = useCorePortfolio(), { run } = usePortfolioSimulation(), key = group ? scopeKey(group) : '';
  // keyed on the group's content: `key` (kind + wave or unit id) is all pfDecision reads of `group`, so a caller may pass an equal group literal built at
  // render without recomputing the verdict; not a stale read (a group with the same key gives the same decision)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `group` (see above)
  return useMemo(() => (run && group && group.kind !== 'unit' ? pfDecision(core, run, group) : null), [core, run, key]);
}

/** The verdict of every wave (the per-wave table of the dashboard). */
export function useWaveDecisions(): { id: string; name: string; decision: Decision | null }[] {
  const core = useCorePortfolio(), { run } = usePortfolioSimulation();
  return useMemo(() => core.waves.filter((w) => run?.waves.some((x) => x.id === w.id)).map((w) => ({ id: w.id, name: w.name,
    decision: run ? pfDecision(core, run, { kind: 'wave', id: w.id }) : null })), [core, run]);
}

/** Draws and seed shown for the next run: those the user set here, else those of the active product's Monte Carlo inputs. */
export function usePfSimParams(): PfSimParams {
  const set = useSyncExternalStore(pfSimStore.subscribe, () => pfSimStore.getState().params), c = useCtx();
  return useMemo(() => set ?? { draws: mcDrawsOf(c), seed: mcSeedOf(c) }, [set, c]);
}

/**
 * The group the Decision section speaks for: the portfolio, a wave or a unit when the display scope says so and there are two products or more; null = the
 * active product.
 */
export function useVerdictGroup(): ScopeGroup | null {
  const scope = useDisplayScope(), multi = useIsMulti(), key = scopeKey(scope);
  // keyed on the scope's content: `key` (kind + wave or unit id) is all groupOf reads of `scope`, so the group keeps its identity while the scope is
  // replaced by an equal one (a file opened, the same scope chosen again); not a stale read
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `scope` (see above)
  return useMemo(() => (multi ? groupOf(scope) : null), [multi, key]);
}
