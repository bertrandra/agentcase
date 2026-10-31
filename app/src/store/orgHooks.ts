/** @calc-zone process-model */
import { useCallback, useMemo, useRef } from 'react';
import { orgDiagnostics, orgOf, type OrgDiagnostic, type OrgModel } from '@/domain/org';
import type { XDocument } from '@/domain/process';
import { structuralEqual } from './equal';
import { useDocSelector, usePortfolio } from './hooks';
import type { Doc } from './types';

const NO_LINES: never[] = [];
const whole = (m: OrgModel): OrgModel => m;
interface Built { bpmn: XDocument; customer: string; products: unknown; sharedTeam: unknown; m: OrgModel }
/**
 * A part of the organisation model of the shown case (docs/SPEC_BPMN.md § 16): units and RACI from its `BPMN` document, teams derived from the
 * products' entry teams and the shared team lines. The model is rebuilt only when one of them changes identity, and the component re-renders only
 * when the selected part changes by `isEqual` (default: structurally), so an edit the part does not show (an activity's effort for the units)
 * renders nothing.
 */
export function useOrgSelector<T>(select: (m: OrgModel) => T, isEqual: (a: T, b: T) => boolean = structuralEqual): T {
  const products = usePortfolio((p) => p.products), sharedTeam = usePortfolio((p) => p.sharedTeam ?? NO_LINES), built = useRef<Built | null>(null);
  const of = useCallback((d: Doc): T => {
    const bpmn = d.BPMN, customer = String(d.customerName ?? ''), b = built.current;
    const same = b && b.bpmn === bpmn && b.customer === customer && b.products === products && b.sharedTeam === sharedTeam;
    const m = same ? b.m : orgOf({ products, sharedTeam, customer }, bpmn);
    built.current = { bpmn, customer, products, sharedTeam, m };
    return select(m);
  }, [products, sharedTeam, select]);
  return useDocSelector(of, isEqual);
}
/** The whole organisation model of the shown case, kept while structurally equal (see `useOrgSelector`). */
export const useOrg = (): OrgModel => useOrgSelector(whole);
/** The organisation diagnostics (F-B36, F-B37) of a model, memoised on it. */
export const useOrgDiagnostics = (m: OrgModel): OrgDiagnostic[] => useMemo(() => orgDiagnostics(m), [m]);
