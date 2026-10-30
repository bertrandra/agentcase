/** @calc-zone aggregate-views */
import { useMemo } from 'react';
import { scopeAudit, type AuditAgg } from '@/domain/portfolio/aggAudit';
import { useCorePortfolio } from './consolidationHooks';
import { useViewScope } from './viewScope';

/** Read-only synthesis of the 🔎 Audit section over the View's products (memoised on the portfolio and the selection). */
export function useScopeAudit(): AuditAgg {
  const core = useCorePortfolio(), { productIds } = useViewScope();
  return useMemo(() => scopeAudit(core, productIds), [core, productIds]);
}
