/** @calc-zone process-model */
import { useMemo } from 'react';
import { orgDiagnostics, orgOf, type OrgDiagnostic, type OrgModel } from '@/domain/org';
import { useDoc, usePortfolio } from './hooks';

/**
 * The organisation model of the shown case (docs/SPEC_BPMN.md § 16): units, teams and owners from the organisation part of the common document
 * (schema v5), roles and RACI from the case's `BPMN` document. Recomputed only when one of them changes identity.
 */
export function useOrg(): OrgModel {
  const bpmn = useDoc((d) => d.BPMN), customer = useDoc((d) => String(d.customerName ?? ''));
  const products = usePortfolio((p) => p.products), common = usePortfolio((p) => p.common);
  return useMemo(() => orgOf({ products, common, customer }, bpmn), [products, common, customer, bpmn]);
}
/** The organisation diagnostics (F-B36, F-B37) of a model, memoised on it. */
export const useOrgDiagnostics = (m: OrgModel): OrgDiagnostic[] => useMemo(() => orgDiagnostics(m), [m]);
