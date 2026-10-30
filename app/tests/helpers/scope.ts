import { setProductOverride } from '@/controllers/productOverrides';
import { resolveProduct, type Portfolio } from '@/domain/portfolio';
import { scopeOf, type ScopeKeys, type XDocument } from '@/domain/process';
import { appStore } from '@/store/instance';
import { scopedProcess } from '@/store/persistence/bpmn/legacy';

/**
 * Schema v3 (docs/SPEC_BPMN.md § 6.1): the version 2 scope keys live in the case's process document. Tests that set them write the document
 * (`scopedProcess`, the same path as the legacy scope commands) and read them back with `scopeOf`.
 */
type WithProcess = { BPMN: XDocument };

/** A copy of a case with these scope keys written on its process document. */
export function withScopeKeys<T extends WithProcess>(c: T, scope: Partial<ScopeKeys>): T {
  return { ...c, BPMN: scopedProcess(c.BPMN, scope) };
}
/** The scope keys of a case (or common values). */
export const keysOf = (c: object): ScopeKeys => scopeOf(c as WithProcess);

/** A product override of the process document: the product's effective document with these scope keys (whole-document override, F-B20). */
export function setScopeOverride(productId: string, scope: Partial<ScopeKeys>, pf: Portfolio = appStore().getState().portfolio): boolean {
  return setProductOverride(productId, 'BPMN', scopedProcess(resolveProduct(pf, productId).BPMN, scope));
}
