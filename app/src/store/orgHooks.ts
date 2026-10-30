/** @calc-zone process-model */
import { useMemo } from 'react';
import { orgDiagnostics, orgOf, type OrgDiagnostic, type OrgModel } from '@/domain/org';
import { useDoc, usePortfolio } from './hooks';

const NO_LINES: never[] = [];
/**
 * The organisation model of the shown case (docs/SPEC_BPMN.md § 16): units and RACI from its `BPMN` document, teams derived from the products'
 * entry teams and the shared team lines. Recomputed only when one of them changes identity.
 */
export function useOrg(): OrgModel {
  const bpmn = useDoc((d) => d.BPMN), customer = useDoc((d) => String(d.customerName ?? ''));
  const products = usePortfolio((p) => p.products), sharedTeam = usePortfolio((p) => p.sharedTeam ?? NO_LINES);
  return useMemo(() => orgOf({ products, sharedTeam, customer }, bpmn), [products, sharedTeam, customer, bpmn]);
}
/** The organisation diagnostics (F-B36, F-B37) of a model, memoised on it. */
export const useOrgDiagnostics = (m: OrgModel): OrgDiagnostic[] => useMemo(() => orgDiagnostics(m), [m]);
