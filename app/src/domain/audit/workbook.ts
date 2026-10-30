/** @calc-zone process-model */
import type { XDocument } from '../process/xml';
import { activityAudits } from './analysis';
import { effectiveCatalog } from './catalog';
import { AUDIT_BLOCKS, AUDIT_FIELDS, BLOCK_LABELS, type AuditBlock, type AuditField } from './fields';
import { readAudit } from './read';
import { AI_USES, CONFIDENCES, HOSTINGS, PERIODS, SOURCES, YES_NO_LATER } from './types';

/**
 * The audit workbook (F-B32), as plain rows (the ExcelJS writer and reader are in store/persistence/excel/audit): one sheet per block of § 15.3,
 * one row per in-scope activity (more rows for a per-role split, D-B13: the Role column), the tools, pain points and evidence sheets, and the
 * lists the drop-downs read (catalogue codes, enumerations). The reader finds its columns by header text, so moved columns still read.
 */
export type Cell = string | number;
/** `lists`: column index → index of its list in `listColumns` (a drop-down). */
export interface SheetSpec { name: string; header: string[]; rows: Cell[][]; lists: Record<number, number> }

export type Part = 'value' | 'per' | 'source' | 'date' | 'confidence';
export interface FieldColumn { field: AuditField; part: Part; header: string }
const SUFFIX: Record<Part, string> = { value: '', per: ' · per', source: ' · source', date: ' · date', confidence: ' · confidence' };
export const ID_HEADERS = ['Activity id', 'Activity', 'Phase', 'Role'] as const;
export const TOOL_HEADERS = ['Activity id', 'Activity', 'Capability', 'Tool', 'Version', 'Edition', 'Licence count', 'Hosting', 'Integration',
  'AI features', 'Data residency', 'Owner team', 'Source', 'Date', 'Confidence'] as const;
export const PAIN_HEADERS = ['Activity id', 'Activity', 'Severity (1-5)', 'AI candidate', 'Pain point'] as const;
export const EVIDENCE_HEADERS = ['Activity id', 'Activity', 'Evidence', 'Link', 'Interview', 'Confidence'] as const;
export const SHEET = { tools: 'Tools', pain: 'Pain points', evidence: 'Evidence', lists: 'Lists' } as const;
export const blockSheet = (b: AuditBlock): string => BLOCK_LABELS[b];

/** The columns of a block sheet after the four id columns. */
export function blockColumns(b: AuditBlock): FieldColumn[] {
  return AUDIT_FIELDS.filter((f) => f.block === b).flatMap((field) => (['value', 'per', 'source', 'date', 'confidence'] as Part[])
    .filter((p) => p !== 'per' || field.period).map((part) => ({ field, part, header: `${field.label}${SUFFIX[part]}` })));
}

/** The lists of the drop-downs (column of the Lists sheet, by name). */
export function listColumns(d: XDocument): [string, readonly string[]][] {
  return [['Tool', effectiveCatalog(readAudit(d)).filter((t) => !t.retired).map((t) => t.code)], ['Source', SOURCES], ['Confidence', CONFIDENCES],
    ['Period', PERIODS], ['Hosting', HOSTINGS], ['AI features', AI_USES], ['AI candidate', YES_NO_LATER],
    ...AUDIT_FIELDS.filter((f) => f.kind === 'choice').map((f): [string, readonly string[]] => [f.label, f.options ?? []])];
}

/** Every sheet of the template, filled with the audit the case already holds (so a workbook can go back and forth). */
export function auditSheets(d: XDocument): SheetSpec[] {
  const rows = activityAudits(d).filter((r) => r.inScope), audit = readAudit(d), lists = new Map(listColumns(d).map(([n], i) => [n, i]));
  const listOf = (name: string): number => lists.get(name) ?? -1;
  const blocks = AUDIT_BLOCKS.map((b): SheetSpec => {
    const cols = blockColumns(b), header = [...ID_HEADERS, ...cols.map((c) => c.header)], out: Cell[][] = [];
    for (const r of rows) {
      const obs = (audit.elements.get(r.id)?.observations ?? []).filter((o) => cols.some((c) => c.field.name === o.name));
      for (const role of [undefined, ...new Set(obs.map((o) => o.role).filter((x): x is string => !!x))]) {
        out.push([r.id, r.name, r.phase, role ?? '', ...cols.map((c) => {
          const o = obs.find((x) => x.name === c.field.name && x.role === role);
          return (c.part === 'value' ? o?.value : o?.[c.part]) ?? '';
        })]);
      }
    }
    const dropdowns: Record<number, number> = {};
    cols.forEach((c, i) => {
      const name = c.part === 'value' && c.field.kind === 'choice' ? c.field.label
        : c.part === 'source' ? 'Source' : c.part === 'confidence' ? 'Confidence' : c.part === 'per' ? 'Period' : '';
      if (name) dropdowns[ID_HEADERS.length + i] = listOf(name);
    });
    return { name: blockSheet(b), header, rows: out, lists: dropdowns };
  });
  const tools: Cell[][] = rows.flatMap((r) => {
    const uses = audit.elements.get(r.id)?.tools ?? [];
    if (!uses.length) return [[r.id, r.name, r.capability]];
    return uses.map((t) => [r.id, r.name, r.capability, t.ref, t.version ?? '', t.edition ?? '', t.licenceCount ?? '', t.hosting ?? '',
      (t.integration ?? []).join(' '), t.aiFeatures ?? '', t.dataResidency ?? '', t.ownerTeam ?? '', t.source ?? '', t.date ?? '', t.confidence ?? '']);
  });
  const each = <T>(pick: (id: string) => T[], row: (id: string, name: string, x: T) => Cell[]): Cell[][] =>
    rows.flatMap((r) => pick(r.id).map((x) => row(r.id, r.name, x)));
  const pain = each((id) => audit.elements.get(id)?.painPoints ?? [], (id, n, p) => [id, n, p.severity, p.aiCandidate ?? '', p.text]);
  const evidence = each((id) => audit.elements.get(id)?.evidence ?? [], (id, n, v) => [id, n, v.name, v.link ?? '', v.interview ?? '', v.confidence ?? '']);
  const L = listOf;
  return [...blocks,
    { name: SHEET.tools, header: [...TOOL_HEADERS], rows: tools,
      lists: { 3: L('Tool'), 7: L('Hosting'), 9: L('AI features'), 12: L('Source'), 14: L('Confidence') } },
    { name: SHEET.pain, header: [...PAIN_HEADERS], rows: pain, lists: { 3: L('AI candidate') } },
    { name: SHEET.evidence, header: [...EVIDENCE_HEADERS], rows: evidence, lists: { 5: L('Confidence') } }];
}
