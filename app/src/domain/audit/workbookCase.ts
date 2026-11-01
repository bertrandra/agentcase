/** @calc-zone process-model */
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { effectiveCatalog, shippedTool } from './catalog';
import { FIELD_BY_NAME } from './fields';
import { readAudit } from './read';
import type { CatalogTool } from './types';
import type { Cell, SheetSpec } from './workbook';

/**
 * The case-level sheets of the audit workbook (SPEC_FIXES FX-28, FX-29): the audit header (one row per item, auditors and interviews one row
 * each), the role-level audits (one row per observation on a role resource), and the tool catalogue (every entry of the effective catalogue:
 * the case's own entries are editable, the shipped ones are there to read). Read back by `readCaseSheets` (workbookCaseRead.ts).
 */
export const CASE_SHEET = { header: 'Header', roles: 'Roles', catalogue: 'Catalogue' } as const;
export const HEADER_HEADERS = ['Item', 'Value', 'Detail', 'Who', 'Date'] as const;
export const HEADER_ITEMS = {
  code: 'Code', client: 'Client', scope: 'Scope', status: 'Status', asOf: 'As of', auditor: 'Auditor', interview: 'Interview',
} as const;
export const ROLE_HEADERS = ['Role id', 'Role', 'Field', 'Value', 'Per', 'Source', 'Date', 'Confidence'] as const;
export const CATALOGUE_HEADERS = ['Code', 'Name', 'Vendor', 'Category', 'Licence', 'Capabilities', 'AI features', 'Integration', 'Hosting',
  'Client-specific', 'Retired', 'Origin'] as const;
export const ORIGIN = { shipped: 'shipped (read-only)', case: 'case' } as const;

const words = (xs: readonly string[]): string => xs.join(' ');
const yes = (b: boolean): string => (b ? 'yes' : '');
const DROP: readonly string[] = ['source', 'asOf', 'verification', 'note'];
const key = (t: CatalogTool): string => JSON.stringify(Object.entries(t).filter(([k, v]) => !DROP.includes(k) && v !== undefined)
  .sort(([x], [y]) => x.localeCompare(y)));
/** True when two entries hold the same facts (the shipped-only provenance and the date aside). */
export const sameTool = (a: CatalogTool, b: CatalogTool): boolean => key(a) === key(b);
/** True when the case's entry adds nothing to the shipped one of the same code (it need not be kept). */
export const asShipped = (t: CatalogTool): boolean => { const s = shippedTool(t.code); return !!s && sameTool(t, s); };

/** The three sheets; `list(name)` is the column of the Lists sheet a drop-down reads. */
export function caseSheets(d: XDocument, list: (name: string) => number): SheetSpec[] {
  const a = readAudit(d), h = a.header, I = HEADER_ITEMS;
  const header: Cell[][] = [[I.code, h?.code ?? ''], [I.client, h?.client ?? ''], [I.scope, h?.scope ?? ''], [I.status, h?.status ?? ''],
    [I.asOf, h?.asOf ?? ''], ...(h?.auditors ?? []).map((x) => [I.auditor, x.name, x.organisation ?? '']),
    ...(h?.interviews ?? []).map((x) => [I.interview, x.code, x.role, x.who ?? '', x.date])];
  const roles: Cell[][] = readProcess(d).actors.flatMap((r) => (a.elements.get(r.id)?.observations ?? []).map((o) => [r.id, r.name,
    FIELD_BY_NAME.get(o.name)?.label ?? o.name, o.value, o.per ?? '', o.source ?? '', o.date ?? '', o.confidence ?? '']));
  const own = new Set(a.caseTools.map((t) => t.code));
  const catalogue: Cell[][] = effectiveCatalog(a).map((t) => [t.code, t.name, t.vendor ?? '', t.category ?? '', words(t.licence), words(t.capabilities),
    words(t.aiFeatures), words(t.integration), words(t.hosting), yes(t.clientSpecific), yes(t.retired), own.has(t.code) ? ORIGIN.case : ORIGIN.shipped]);
  return [
    { name: CASE_SHEET.header, header: [...HEADER_HEADERS], rows: header, lists: {} },
    { name: CASE_SHEET.roles, header: [...ROLE_HEADERS], rows: roles, lists: { 4: list('Period'), 5: list('Source'), 7: list('Confidence') } },
    { name: CASE_SHEET.catalogue, header: [...CATALOGUE_HEADERS], rows: catalogue, lists: {} },
  ];
}
