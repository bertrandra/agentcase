/** @calc-zone exports */
import { catalogJson, effectiveCatalog, readAudit, shippedTool, toolOk, type AuditImport, type CatalogTool } from '@/domain/audit';
import { activeDoc } from '@/store/editBase';
import { auditWorkbookBytes, readAuditWorkbookBytes } from '@/store/persistence/excel/audit';
import { ParamsImportError } from '@/store/persistence/excel/params';
import { buildAuditReport } from '@/store/persistence/report/audit';
import { applyAuditImport, auditBase, editToolCatalog, today } from './audit';
import { exportTheme } from './exportTheme';

/**
 * The audit's files (docs/SPEC_BPMN.md F-B26, F-B32, F-B34, F-B35): the audit workbook (template out, interviews back in), the audit report and
 * the tool catalogue as JSON. Every file with audit data says so in its name. Imports read the whole file first; nothing is written before it is
 * checked, and the write is one undoable step.
 */
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const customer = (): string => String(activeDoc().customerName ?? '').trim();
const tag = (): string => customer().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'case';
export interface AuditFile { name: string; size?: number; arrayBuffer(): Promise<ArrayBuffer> }
const MAX = 8 * 1024 * 1024;

/** "Export audit template": the workbook of the shown case, filled with what its audit already holds. */
export async function auditTemplate(now: Date = new Date()): Promise<{ filename: string; blob: Blob }> {
  const bytes = await auditWorkbookBytes(auditBase(), exportTheme(), customer());
  return { filename: `AgentCase_Audit_${tag()}_${today(now)}_contains_audit_data.xlsx`, blob: new Blob([bytes], { type: XLSX }) };
}

/** "Import audit workbook": checked against the case as it is now, applied as one step; the report counts added / updated / ignored rows. */
export async function importAuditWorkbook(file: AuditFile, now: Date = new Date()): Promise<AuditImport> {
  if (typeof file.size === 'number' && file.size > MAX) throw new ParamsImportError(`File too large (limit ${MAX / 1024 / 1024} MB)`);
  const r = await readAuditWorkbookBytes(await file.arrayBuffer(), auditBase(), today(now));
  if (r.ops.length || r.header || r.catalog) applyAuditImport(r.ops, { header: r.header, catalog: r.catalog, today: today(now) });
  return r;
}

/** The audit report of the shown case (a standalone HTML page). */
export const auditReportFile = (now: Date = new Date()) => buildAuditReport(auditBase(), exportTheme(), customer(), now);

/** The effective tool catalogue of the case as JSON (shipped entries with their sources, the case's own entries). */
export function catalogFile(now: Date = new Date()): { filename: string; json: string } {
  return { filename: `AgentCase_tool_catalogue_${tag()}_${today(now)}.json`, json: catalogJson(effectiveCatalog(readAudit(auditBase())), today(now)) };
}

const same = (a: CatalogTool, b: CatalogTool): boolean => JSON.stringify({ ...a, source: undefined, asOf: undefined })
  === JSON.stringify({ ...b, source: undefined, asOf: undefined });
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Import a tool catalogue JSON (F-B26): each entry checked like an edit; entries equal to the shipped ones are skipped (the case keeps only its
 * own entries); one undoable step. Returns the number of entries taken and refused.
 */
export async function importCatalogFile(file: { size?: number; text(): Promise<string> }): Promise<{ taken: number; refused: number }> {
  if (typeof file.size === 'number' && file.size > 2 * 1024 * 1024) throw new Error('File too large (limit 2 MB)');
  let data: unknown;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('Not a JSON file'); }
  const list = (data as { tools?: unknown })?.tools;
  if (!Array.isArray(list)) throw new Error('Not a tool catalogue (no "tools" list)');
  const tools: CatalogTool[] = [];
  let refused = 0;
  for (const raw of list.slice(0, 2000) as Record<string, unknown>[]) {
    const s = (k: string) => (typeof raw[k] === 'string' ? raw[k] as string : undefined);
    const t = toolOk({ code: s('code') ?? '', name: s('name') ?? '', ...(s('vendor') ? { vendor: s('vendor') } : {}),
      ...(s('category') ? { category: s('category') } : {}), licence: strs(raw.licence), capabilities: strs(raw.capabilities),
      aiFeatures: strs(raw.aiFeatures), integration: strs(raw.integration), hosting: strs(raw.hosting),
      clientSpecific: raw.clientSpecific === true, retired: raw.retired === true });
    if (!t) { refused++; continue; }
    const shipped = shippedTool(t.code);
    if (!shipped || !same(t, shipped)) tools.push(t);
  }
  if (tools.length) editToolCatalog({ kind: 'import', tools });
  return { taken: tools.length, refused };
}
