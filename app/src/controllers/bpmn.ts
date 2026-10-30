/** @calc-zone exports */
import { resolveProduct } from '@/domain/portfolio';
import { collaborationAudit, exportAuditDoc, hasAudit } from '@/domain/audit';
import { collaborationDocument, collaborationText, exportCaseText, LIMITS, serialize, type ProductInput } from '@/domain/process';
import { activeDoc } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { parseBpmn, type ParseResult } from '@/store/persistence/bpmn/read';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';

/**
 * Process export and file reading (docs/SPEC_BPMN.md § 4.1, § 4.3; phase B2). Export: the active case (or the product shown), every product of
 * a portfolio as its own file, or one collaboration file with one pool per product (F-B5). Reading: `parseBpmnFile` gives the node tree and its
 * diagnostics; nothing is written to the store (the import commands come with phase B4).
 */
export type BpmnExportMode = 'shown' | 'perProduct' | 'collaboration';
export interface BpmnFile { filename: string; text: string }
export const BPMN_MIME = 'application/xml';

const tag = (s: string | undefined): string => (s ?? '').trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
/** "AgentCase_process_<customer>_<product>_<YYYY-MM-DD>.bpmn" (F-B1: customer and product names and the date; F-B35: "contains_audit_data"). */
export function bpmnFilename(customer: string | undefined, product: string | undefined, now: Date = new Date(), audit = false): string {
  return `${['AgentCase_process', tag(customer) || 'case', tag(product)].filter(Boolean).join('_')}_${now.toISOString().slice(0, 10)}`
    + `${audit ? '_contains_audit_data' : ''}.bpmn`;
}

/**
 * What the export dialog offers: a portfolio (two products or more, an override, waves…) adds the per-product and collaboration choices; a case
 * with audit data adds "include audit data" (D-B14: off by default).
 */
export function bpmnExportChoices(): { portfolio: boolean; products: number; shown: string; audit: boolean } {
  const pf = appStore().getState().portfolio, products = pf.products.filter((p) => !p.archived);
  return { portfolio: hasPortfolioContent(pf), products: products.length, shown: pf.products.find((p) => p.id === pf.activeProductId)?.name ?? '',
    audit: hasAudit(activeDoc().BPMN) || products.some((p) => p.overrides.BPMN !== undefined && hasAudit(p.overrides.BPMN)) };
}

/** The products of the portfolio as export inputs (codes P1, P2… in portfolio order; archived products left out). */
function productInputs(): ProductInput[] {
  const pf = appStore().getState().portfolio;
  return pf.products.filter((p) => !p.archived).map((p, i) => ({ code: `P${i + 1}`, name: p.name, case: resolveProduct(pf, p.id) }));
}

/**
 * The `.bpmn` file(s) of an export. `partial`: in-scope activities only (F-B3). `audit`: include the audit data (F-B33, D-B14; without it the
 * file carries the process only). Deterministic content (F-B4); the date is in the name only.
 */
export function exportProcessFiles(mode: BpmnExportMode, partial = false, now: Date = new Date(), audit = false): BpmnFile[] {
  const customer = activeDoc().customerName as string | undefined, { portfolio, shown } = bpmnExportChoices();
  const withAudit = <C extends { BPMN: ProductInput['case']['BPMN'] }>(c: C): C => ({ ...c, BPMN: exportAuditDoc(c.BPMN, audit) });
  const name = (product: string | undefined) => bpmnFilename(customer, product, now, audit);
  if (mode === 'shown' || !portfolio) {
    const pf = appStore().getState().portfolio, i = pf.products.filter((p) => !p.archived).findIndex((p) => p.id === pf.activeProductId);
    const product = portfolio ? { code: `P${i + 1}`, name: shown } : undefined;
    return [{ filename: name(portfolio ? shown : undefined), text: exportCaseText(withAudit(activeDoc()), { partial, product }) }];
  }
  const items = productInputs(), out = items.map((p) => ({ ...p, case: withAudit(p.case) }));
  if (mode === 'collaboration') {
    const text = audit ? serialize(collaborationAudit(collaborationDocument(out, { partial }), items.map((p) => ({ code: p.code, doc: p.case.BPMN }))))
      : collaborationText(out, { partial });
    return [{ filename: name('portfolio'), text }];
  }
  return out.map((p) => ({ filename: name(p.name), text: exportCaseText(p.case, { partial, product: { code: p.code, name: p.name } }) }));
}

/**
 * Reads a `.bpmn` / `.xml` file (F-B6, F-B10): refused before reading when larger than the limit, then the security checks on the raw text,
 * the parse and the BPMN root check. Returns the node tree (null when refused) with its errors and warnings. Writes nothing.
 */
export async function parseBpmnFile(file: { size: number; text(): Promise<string> }): Promise<ParseResult> {
  return parseBpmn(file.size > LIMITS.bytes ? '' : await file.text(), file.size);
}
