import { useMemo } from 'react';
import type { Portfolio, VScope } from '@/domain/portfolio';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** The View's selection (Portfolio or one Wave) as the "verify" domain view models take it; null for a Product view. */
export function useVScope(): VScope | null {
  const vs = useViewScope();
  return useMemo((): VScope | null => (vs.kind === 'portfolio' ? { kind: 'portfolio' } : vs.kind === 'wave' && vs.waveId ? { kind: 'wave', id: vs.waveId } : null), [vs]);
}

/** A "verify" aggregate view model (`domain/portfolio/aggVerify*`) of the View's selection; null for a Product view or an unknown wave. Memoised in the domain per consolidation. */
export function useVerifyView<T, A = undefined>(view: (pf: Portfolio, scope: VScope, arg?: A) => T | null, arg?: A): T | null {
  const core = useCorePortfolio(), scope = useVScope();
  return useMemo(() => (scope ? view(core, scope, arg) : null), [core, scope, view, arg]);
}
