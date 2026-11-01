/** @calc-zone process-model */
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { effectiveCatalog } from './catalog';
import { patchedHeader, type HeaderPatch } from './edit';
import { toolOk } from './editCatalog';
import { AUDIT_FIELDS } from './fields';
import { applyElementOp, emptyAudit, observationOk, type ElementOp } from './ops';
import { readAudit } from './read';
import type { AuditStatus, CatalogTool, ElementAudit, Observation } from './types';
import type { Cell } from './workbook';
import { asShipped, CASE_SHEET, HEADER_ITEMS as I, ORIGIN, sameTool } from './workbookCase';

/**
 * Reading the case-level sheets back (SPEC_FIXES FX-28, FX-29), checked whole like the activity sheets: the header patch (lists replaced by
 * the sheet's rows), the observations on roles (merged by field), the case's catalogue entries (a shipped entry is read-only: a changed row
 * marked "shipped" is ignored with a note; mark it "case" to keep the change for this case).
 */
export interface CaseImport {
  ops: { id: string; op: ElementOp }[]; header?: HeaderPatch; catalog: CatalogTool[]; added: number; updated: number; ignored: number; unchanged: number;
  notes: string[];
}
type Rows = readonly (readonly Cell[])[];
const s = (c: Cell | undefined): string => (c === undefined ? '' : String(c).trim());
const or = (v: string): string | undefined => v || undefined;
const list = (v: string): string[] => v.split(/[\s,;]+/).filter(Boolean);
/** The field a Roles row names, by its label or its name (any case). */
const fieldOf = (t: string): string | undefined => AUDIT_FIELDS.find((f) => f.name.toLowerCase() === t || f.label.toLowerCase() === t)?.name;

/** Each non-empty row of a sheet as header → cell. */
function each(rows: Rows | undefined, name: string, f: (get: (h: string) => string, where: string) => void): void {
  if (!rows?.length) return;
  const head = rows[0]!.map(s);
  rows.slice(1).forEach((r, i) => { if (r.some((c) => s(c))) f((h) => { const j = head.indexOf(h); return j < 0 ? '' : s(r[j]); }, `${name} row ${i + 2}`); });
}

export function readCaseSheets(d: XDocument, sheets: ReadonlyMap<string, Rows>, today: string): CaseImport {
  const a = readAudit(d), out: CaseImport = { ops: [], catalog: [], added: 0, updated: 0, ignored: 0, unchanged: 0, notes: [] };
  const refuse = (why: string) => { out.ignored++; out.notes.push(why); };
  const count = (_: unknown, had: boolean) => { if (had) out.updated++; else out.added++; };
  const actors = readProcess(d).actors, roles = new Set(actors.map((r) => r.id)), byName = new Map(actors.map((r) => [r.name.toLowerCase(), r.id]));
  if (sheets.has(CASE_SHEET.header)) {
    const p: HeaderPatch = { auditors: [], interviews: [] };
    each(sheets.get(CASE_SHEET.header), CASE_SHEET.header, (get) => {
      const item = get('Item'), v = get('Value');
      if (item === I.code && v) p.code = v; else if (item === I.client) p.client = v; else if (item === I.scope) p.scope = v;
      else if (item === I.status && v) p.status = v as AuditStatus; else if (item === I.asOf && v) p.asOf = v;
      else if (item === I.auditor && v) p.auditors!.push({ name: v, ...(get('Detail') ? { organisation: get('Detail') } : {}) });
      else if (item === I.interview && v) {
        p.interviews!.push({ code: v, role: get('Detail'), ...(get('Who') ? { who: get('Who') } : {}), date: get('Date') });
      }
    });
    const next = patchedHeader(a.header, p, { code: 'AUDIT-1', asOf: today }), empty = !a.header && !p.code && !p.client && !p.scope
      && !p.status && !p.auditors!.length && !p.interviews!.length;
    if (!next) refuse(`${CASE_SHEET.header}: a value is refused (code, status, date or interview)`);
    else if (empty || JSON.stringify(next) === JSON.stringify(a.header)) { if (!empty) out.unchanged++; } else count(out.header = p, !!a.header);
  }
  const work = new Map<string, ElementAudit>();
  each(sheets.get(CASE_SHEET.roles), CASE_SHEET.roles, (get, where) => {
    const cell = get('Role id') || get('Role'), id = roles.has(cell) ? cell : byName.get(cell.toLowerCase()), name = fieldOf(get('Field').toLowerCase());
    if (!id) { refuse(`${where}: unknown role "${cell.slice(0, 80)}"`); return; }
    const raw = Object.fromEntries(Object.entries({ name, value: get('Value'), per: or(get('Per')), source: or(get('Source')), date: or(get('Date')),
      confidence: or(get('Confidence')) }).filter(([, v]) => v)) as unknown as Observation;
    const o = name && raw.value ? observationOk(raw, roles) : null, cur = work.get(id) ?? a.elements.get(id) ?? emptyAudit(id);
    const prev = o && cur.observations.find((x) => x.name === o.name && !x.role), next = o && applyElementOp(cur, { kind: 'observation', obs: o }, roles);
    if (!o || !next) { refuse(`${where}: ${get('Field') || 'field'} refused`); return; }
    if (prev && JSON.stringify(Object.entries(prev).sort()) === JSON.stringify(Object.entries(o).sort())) { out.unchanged++; return; }
    out.ops.push({ id, op: { kind: 'observation', obs: o } }); work.set(id, next); count(0, !!prev);
  });
  const shown = new Map(effectiveCatalog(a).map((t) => [t.code, t])), own = new Set(a.caseTools.map((t) => t.code));
  each(sheets.get(CASE_SHEET.catalogue), CASE_SHEET.catalogue, (get, where) => {
    const t = toolOk({ code: get('Code'), name: get('Name'), ...(get('Vendor') ? { vendor: get('Vendor') } : {}),
      ...(get('Category') ? { category: get('Category') } : {}), licence: list(get('Licence')), capabilities: list(get('Capabilities')),
      aiFeatures: list(get('AI features')), integration: list(get('Integration')),
      hosting: list(get('Hosting')), clientSpecific: !!get('Client-specific'), retired: !!get('Retired') });
    if (!t) { refuse(`${where}: catalogue entry refused (code, name, capability or a value outside its list)`); return; }
    const cur = shown.get(t.code);
    if (cur && sameTool(t, cur)) { out.unchanged++; return; }
    if (get('Origin') === ORIGIN.shipped && !own.has(t.code)) {
      refuse(`${where}: ${t.code} is a shipped entry (read-only); mark its Origin "case" to keep the change`); return;
    }
    if (!own.has(t.code) && asShipped(t)) { out.unchanged++; return; }
    count(out.catalog.push(t), !!cur);
  });
  return out;
}
