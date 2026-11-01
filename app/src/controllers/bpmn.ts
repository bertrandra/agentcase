/** @calc-zone exports */
import { resolveProduct } from '@/domain/portfolio';
import { collaborationAudit, exportAuditDoc, hasAudit } from '@/domain/audit';
import { collaborationDocument, collaborationText, exportCaseText, LIMITS, serialize, type ProductInput, type XDocument } from '@/domain/process';
import { orgOf, unitElements, withOrganisationDiagram, withUnits } from '@/domain/org';
import { activeDoc } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { parseBpmn, type ParseResult } from '@/store/persistence/bpmn/read';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';
import { makeCtx } from '@/domain/ctx';
import { programmeProcess } from '@/domain/programme';
import { programmeDocument, withProgramme } from '@/domain/programme/bpmn';
import { colourBy, withPhaseDiagrams, type ColourMode } from '@/domain/process/profile';

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

/** A product's own process document carries no organisation (B10a): its export gets the common document's units, as the common one has them. */
function withOrgUnits(d: XDocument): XDocument {
  const common = unitElements(appStore().getState().portfolio.common.BPMN as XDocument | undefined);
  return !common.length || unitElements(d).length ? d : withUnits(d, common);
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
/** FX-10: the export's display options — colours (BPMN in Color) by scope, task type or AI authority; one more diagram per phase. */
export interface ViewOptions { colours?: ColourMode; phaseDiagrams?: boolean }
export function exportProcessFiles(mode: BpmnExportMode, partial = false, now: Date = new Date(), audit = false,
  processes: ProcessChoice = 'delivery', orgView = false, view: ViewOptions = {}): BpmnFile[] {
  const files = deliveryFiles(mode, partial, now, audit), withOrg = orgView && mode !== 'collaboration' ? files.map(organised) : files;
  const shaped = view.colours || view.phaseDiagrams ? withOrg.map((f) => displayed(f, view)) : withOrg;
  return processes === 'delivery' ? shaped : withProgrammeFiles(shaped, processes, mode);
}

function displayed(f: BpmnFile, v: ViewOptions): BpmnFile {
  let d = parseBpmn(f.text).doc;
  if (!d) return f;
  if (v.colours) d = colourBy(d, v.colours);
  if (v.phaseDiagrams) d = withPhaseDiagrams(d);
  return { ...f, text: serialize(d) };
}

/** FX-23 (F-B39): the file with a second diagram "By organisation" (lanes unit → team → role, laid out) for the product shown. */
function organised(f: BpmnFile): BpmnFile {
  const pf = appStore().getState().portfolio, read = parseBpmn(f.text).doc;
  return read ? { ...f, text: serialize(withOrganisationDiagram(read, orgOf(pf, read), pf.activeProductId)) } : f;
}

function deliveryFiles(mode: BpmnExportMode, partial: boolean, now: Date, audit: boolean): BpmnFile[] {
  const customer = activeDoc().customerName as string | undefined, { portfolio, shown } = bpmnExportChoices();
  const withAudit = <C extends { BPMN: ProductInput['case']['BPMN'] }>(c: C): C => ({ ...c, BPMN: exportAuditDoc(withOrgUnits(c.BPMN), audit) });
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
 * F-B69 (phase B9a): the export offers the delivery process only (as before), the transformation programme only, or both in one file (a second
 * pool, its message flows to the first). The programme is derived from the case shown (`programmeProcess`), so one programme file is written.
 */
export type ProcessChoice = 'delivery' | 'programme' | 'both';
function withProgrammeFiles(files: BpmnFile[], processes: Exclude<ProcessChoice, 'delivery'>, mode: BpmnExportMode): BpmnFile[] {
  const pf = appStore().getState().portfolio, v = programmeProcess(makeCtx(activeDoc()), pf, pf.activeProductId);
  const rename = (f: string, to: string) => f.replace(/^AgentCase_process/, to);
  if (processes === 'programme') return [{ filename: rename(files[0]?.filename ?? 'AgentCase_process.bpmn', 'AgentCase_programme'),
    text: serialize(programmeDocument(v)) }];
  const one = mode === 'perProduct' ? files : files.slice(0, 1);
  return one.map((f) => {
    const read = parseBpmn(f.text).doc;
    return read ? { filename: rename(f.filename, 'AgentCase_process_and_programme'), text: serialize(withProgramme(read, v)) } : f;
  });
}

/**
 * Reads a `.bpmn` / `.xml` file (F-B6, F-B10): refused before reading when larger than the limit, then the security checks on the raw text,
 * the parse and the BPMN root check. Returns the node tree (null when refused) with its errors and warnings. Writes nothing.
 */
export async function parseBpmnFile(file: { size: number; text(): Promise<string> }): Promise<ParseResult> {
  return parseBpmn(file.size > LIMITS.bytes ? '' : await file.text(), file.size);
}
