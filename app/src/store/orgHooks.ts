/** @calc-zone process-model */
import { useCallback, useMemo, useRef } from 'react';
import { orgDiagnostics, orgOf, type OrgDiagnostic, type OrgModel } from '@/domain/org';
import type { XDocument } from '@/domain/process';
import { structuralEqual } from './equal';
import { useDocSelector, usePortfolio } from './hooks';
import type { Doc } from './types';

const whole = (m: OrgModel): OrgModel => m;
interface Built { bpmn: XDocument; customer: string; products: unknown; commonDoc: unknown; m: OrgModel }
/**
 * A part of the organisation model of the shown case (docs/SPEC_BPMN.md § 16): units, teams and owners from the organisation part of the common
 * document (schema v5), roles and RACI from the case's `BPMN` document. The model is rebuilt only when one of them changes identity, and the
 * component re-renders only when the selected part changes by `isEqual` (default: structurally), so an edit the part does not show (an activity's
 * effort for the units) renders nothing.
 */
export function useOrgSelector<T>(select: (m: OrgModel) => T, isEqual: (a: T, b: T) => boolean = structuralEqual): T {
  // The common document only (not `p.common`, whose identity changes with every edit of a shared value): the organisation part lives in it.
  const products = usePortfolio((p) => p.products), commonDoc = usePortfolio((p) => p.common.BPMN), built = useRef<Built | null>(null);
  const of = useCallback((d: Doc): T => {
    const bpmn = d.BPMN, customer = String(d.customerName ?? ''), b = built.current;
    const same = b && b.bpmn === bpmn && b.customer === customer && b.products === products && b.commonDoc === commonDoc;
    const m = same ? b.m : orgOf({ products, common: { BPMN: commonDoc }, customer }, bpmn);
    built.current = { bpmn, customer, products, commonDoc, m };
    return select(m);
  }, [products, commonDoc, select]);
  return useDocSelector(of, isEqual);
}
/** The whole organisation model of the shown case, kept while structurally equal (see `useOrgSelector`). */
export const useOrg = (): OrgModel => useOrgSelector(whole);
/** The organisation diagnostics (F-B36, F-B37) of a model, memoised on it. */
export const useOrgDiagnostics = (m: OrgModel): OrgDiagnostic[] => useMemo(() => orgDiagnostics(m), [m]);
