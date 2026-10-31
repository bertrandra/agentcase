/** @calc-zone process-model */
import { useCallback, useMemo, useRef } from 'react';
import { orgDiagnostics, orgExtOf, orgOf, type OrgDiagnostic, type OrgModel } from '@/domain/org';
import { effortLineShares } from '@/domain/portfolio';
import type { XDocument } from '@/domain/process';
import { structuralEqual } from './equal';
import { useDocSelector, usePortfolio } from './hooks';
import { appStore } from './instance';
import type { Doc } from './types';

const whole = (m: OrgModel): OrgModel => m;
interface Built { bpmn: XDocument; customer: string; products: unknown; org: unknown; effort: unknown; m: OrgModel }
/**
 * A part of the organisation model of the shown case (docs/SPEC_BPMN.md § 16): units, teams and owners from the organisation part of the common
 * document (schema v5), roles and RACI from the case's `BPMN` document. The model is rebuilt only when one of them changes identity, and the
 * component re-renders only when the selected part changes by `isEqual` (default: structurally), so an edit the part does not show (an activity's
 * effort for the units) renders nothing.
 */
export function useOrgSelector<T>(select: (m: OrgModel) => T, isEqual: (a: T, b: T) => boolean = structuralEqual): T {
  // The organisation part only — the common document's collaboration extension elements (units, teams, owners) — not the common document, whose
  // identity changes with every process edit (B10a: a process edit rewrites the common document, its collaboration is kept as it is).
  const products = usePortfolio((p) => p.products), org = usePortfolio((p) => orgExtOf(p.common.BPMN)), built = useRef<Built | null>(null);
  const effort = usePortfolio(effortLineShares);   // the lines split by effort (B10c): their teams serve the products with the effort split
  const of = useCallback((d: Doc): T => {
    const bpmn = d.BPMN, customer = String(d.customerName ?? ''), b = built.current;
    const same = b && b.bpmn === bpmn && b.customer === customer && b.products === products && b.org === org && b.effort === effort;
    const m = same ? b.m : orgOf({ products, common: { BPMN: appStore().getState().portfolio.common.BPMN }, customer, effort }, bpmn);
    built.current = { bpmn, customer, products, org, effort, m };
    return select(m);
  }, [products, org, effort, select]);
  return useDocSelector(of, isEqual);
}
/** The whole organisation model of the shown case, kept while structurally equal (see `useOrgSelector`). */
export const useOrg = (): OrgModel => useOrgSelector(whole);
/** The organisation diagnostics (F-B36, F-B37) of a model, memoised on it. */
export const useOrgDiagnostics = (m: OrgModel): OrgDiagnostic[] => useMemo(() => orgDiagnostics(m), [m]);
