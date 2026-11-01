/** @calc-zone process-model */
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { resourceIds } from './edit';
import { AUDIT_BLOCKS } from './fields';
import { applyElementOp, emptyAudit, observationOk, type ElementOp } from './ops';
import { readAudit } from './read';
import type { CatalogTool, ElementAudit, Observation, ToolUse } from './types';
import type { HeaderPatch } from './edit';
import { blockColumns, blockSheet, SHEET, type Cell } from './workbook';

/**
 * Reading an audit workbook back (F-B32): every row is checked against the document as it is now, before anything is written; the result is
 * the list of operations one undoable command applies, merged by activity id (an observation replaces the one of the same name and role, a
 * tool the one with the same code; pain points and evidence are added unless already there), and the report: added, updated, ignored rows.
 */
export type Sheets = ReadonlyMap<string, readonly (readonly Cell[])[]>;
export interface AuditImport {
  ops: { id: string; op: ElementOp }[]; added: number; updated: number; ignored: number; unchanged: number; notes: string[];
  /** the Header sheet's patch and the case's catalogue entries to keep (FX-28, FX-29), when the workbook changes them */
  header?: HeaderPatch; catalog?: CatalogTool[];
}

const s = (c: Cell | undefined): string => (c === undefined ? '' : String(c).trim());
const opt = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;
const or = (v: string): string | undefined => v || undefined;
const canon = (o: unknown): string => JSON.stringify(o && typeof o === 'object' ? Object.entries(o).sort(([a], [b]) => a.localeCompare(b)) : o);
const sameJson = (a: unknown, b: unknown): boolean => canon(a) === canon(b);

export function readAuditWorkbook(d: XDocument, sheets: Sheets): AuditImport {
  const acts = new Map(readProcess(d).activities.map((a) => [a.id, a])), roles = resourceIds(d), audit = readAudit(d);
  const byName = new Map(readProcess(d).actors.map((a) => [a.name.toLowerCase(), a.id]));
  const out: AuditImport = { ops: [], added: 0, updated: 0, ignored: 0, unchanged: 0, notes: [] };
  const work = new Map<string, ElementAudit>(), cur = (id: string) => work.get(id) ?? audit.elements.get(id) ?? emptyAudit(id);
  const verdict = (where: string, kinds: ('added' | 'updated' | 'refused')[]) => {
    if (kinds.includes('updated')) out.updated++; else if (kinds.includes('added')) out.added++;
    else if (kinds.includes('refused')) { out.ignored++; out.notes.push(`${where}: no valid value`); } else out.unchanged++;
  };
  /** A row's rows: header → cell, the activity id checked. */
  const rowsOf = (name: string, each: (id: string, get: (h: string) => string, where: string) => void) => {
    const rows = sheets.get(name);
    if (!rows?.length) return;
    const head = rows[0]!.map(s);
    rows.slice(1).forEach((r, i) => {
      const get = (h: string) => { const j = head.indexOf(h); return j < 0 ? '' : s(r[j]); }, id = get('Activity id'), where = `${name} row ${i + 2}`;
      if (!id && r.every((c) => !s(c))) return;
      if (!acts.has(id)) { out.ignored++; out.notes.push(`${where}: unknown activity "${id.slice(0, 80)}"`); return; }
      each(id, get, where);
    });
  };
  /** The operation queued when it changes something: 'added' / 'updated', null when the value is already there, 'refused' when invalid. */
  const push = (id: string, op: ElementOp, has: (a: ElementAudit) => unknown): 'added' | 'updated' | 'refused' | null => {
    const before = cur(id), prev = has(before), next = applyElementOp(before, op, roles);
    if (!next) return 'refused';
    if ((op.kind === 'observation' || op.kind === 'tool') && sameJson(prev, op.kind === 'observation' ? op.obs : op.use)) return null;
    out.ops.push({ id, op });
    work.set(id, next);
    return prev ? 'updated' : 'added';
  };
  for (const b of AUDIT_BLOCKS) {
    const cols = blockColumns(b);
    rowsOf(blockSheet(b), (id, get, where) => {
      const roleCell = get('Role'), kinds: ('added' | 'updated' | 'refused')[] = [];
      const role = roleCell ? (roles.has(roleCell) ? roleCell : byName.get(roleCell.toLowerCase()) ?? roleCell) : undefined;
      for (const c of cols.filter((x) => x.part === 'value')) {
        const value = get(c.header);
        if (!value) continue;
        const part = (p: string) => get(cols.find((x) => x.field === c.field && x.part === p)?.header ?? '\u0000');
        const raw = opt({ name: c.field.name, value, per: or(part('per')), role, source: or(part('source')), date: or(part('date')),
          confidence: or(part('confidence')) }) as Observation, o = observationOk(raw, roles);
        const r = o ? push(id, { kind: 'observation', obs: o }, (a) => a.observations.find((x) => x.name === o.name && x.role === o.role)) : 'refused';
        if (r === 'refused') out.notes.push(`${where}: ${c.field.label} refused`);
        if (r) kinds.push(r);
      }
      verdict(where, kinds);
    });
  }
  rowsOf(SHEET.tools, (id, get, where) => {
    const ref = get('Tool');
    if (!ref) return;
    const n = get('Licence count'), integration = get('Integration').split(/\s+/).filter(Boolean);
    const use = opt({ ref, version: or(get('Version')), edition: or(get('Edition')), licenceCount: n ? Number(n) : undefined, hosting: or(get('Hosting')),
      integration: integration.length ? integration : undefined, aiFeatures: or(get('AI features')), dataResidency: or(get('Data residency')),
      ownerTeam: or(get('Owner team')), source: or(get('Source')), date: or(get('Date')), confidence: or(get('Confidence')) }) as ToolUse;
    const r = push(id, { kind: 'tool', use }, (a) => a.tools.find((t) => t.ref === ref));
    verdict(where, r ? [r] : []);
  });
  rowsOf(SHEET.pain, (id, get, where) => {
    const text = get('Pain point'), severity = Number(get('Severity (1-5)')), aiCandidate = or(get('AI candidate'));
    if (!text) return;
    const point = opt({ text, severity, aiCandidate }) as ElementAudit['painPoints'][number];
    if (cur(id).painPoints.some((p) => p.text === text)) { verdict(where, []); return; }
    verdict(where, [push(id, { kind: 'painPoint', point }, () => undefined) ?? 'refused']);
  });
  rowsOf(SHEET.evidence, (id, get, where) => {
    const name = get('Evidence');
    if (!name) return;
    if (cur(id).evidence.some((v) => v.name === name)) { verdict(where, []); return; }
    const evidence = opt({ name, link: or(get('Link')), interview: or(get('Interview')), confidence: or(get('Confidence')) }) as
      ElementAudit['evidence'][number];
    verdict(where, [push(id, { kind: 'evidence', evidence }, () => undefined) ?? 'refused']);
  });
  return out;
}
