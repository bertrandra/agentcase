/** @calc-zone process-model */
import { editById } from '../process/editTree';
import { readProcess } from '../process/read';
import { extOf } from '../process/readTypes';
import { el, NS, withAttrs, type XDocument, type XElement } from '../process/xml';
import { applyElementOp, DATE, emptyAudit, KEY, type ElementOp } from './ops';
import { readAudit } from './read';
import { AUDIT_STATUSES, type AuditHeader, type Auditor, type ElementAudit, type Interview } from './types';
import { auditXml, headerXml, onCollaboration, withExtChild } from './write';

/**
 * The audit commands on the document (F-B27, F-B31): the `ac:audit` of a task or a resource, and the audit header in the collaboration. Each
 * returns the same document when the change is refused (unknown element, value outside the XSD), so a refused command adds no undo step.
 * Observations never touch a model parameter (D-B11): only calibration does (calibrate.ts).
 */
const isAudited = (e: XElement): boolean => e.ns === NS.bpmn && (e.local === 'resource' || !!extOf(e, 'activity'));
const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });

/** The ids of the document's resources (roles and agents): what an observation's per-role split may name. */
export const resourceIds = (d: XDocument): Set<string> => new Set(readProcess(d).actors.map((a) => a.id));

/** One operation on the audit of a task or resource (by element id). */
export function editElementAudit(d: XDocument, id: string, op: ElementOp): XDocument {
  const cur = readAudit(d).elements.get(id) ?? emptyAudit(id), next = applyElementOp(cur, op, resourceIds(d));
  if (!next) return d;
  let found = false;
  const root = editById(d.root, id, (e) => {
    if (!isAudited(e)) return e;
    found = true;
    return withExtChild(e, 'audit', auditXml(next));
  });
  return found ? same(d, root) : d;
}

/** What the header form may change; arrays replace the lists. */
export type HeaderPatch = Partial<Pick<AuditHeader, 'code' | 'client' | 'scope' | 'status' | 'asOf' | 'auditors' | 'interviews'>>;
const textOk = (v: string | undefined, max: number): boolean => v === undefined || v.length <= max;
const auditorOk = (a: Auditor): boolean => !!a.name.trim() && a.name.length <= 200 && textOk(a.organisation, 200);
const interviewOk = (i: Interview): boolean => KEY.test(i.code) && !!i.role.trim() && i.role.length <= 200 && DATE.test(i.date) && textOk(i.who, 200);

/** The header with `patch` applied (created with `base` when absent), or null when a value is outside the XSD. */
export function patchedHeader(cur: AuditHeader | undefined, patch: HeaderPatch, base: { code: string; asOf: string }): AuditHeader | null {
  const h: AuditHeader = { ...(cur ?? { code: base.code, status: 'planned', asOf: base.asOf, auditors: [], interviews: [], calibrations: [] }) };
  for (const k of ['client', 'scope'] as const) if (k in patch) { const v = patch[k]?.trim(); if (v) h[k] = v; else delete h[k]; }
  if (patch.code !== undefined) h.code = patch.code.trim();
  if (patch.status !== undefined) h.status = patch.status;
  if (patch.asOf !== undefined) h.asOf = patch.asOf;
  if (patch.auditors) h.auditors = patch.auditors.map((a) => (a.organisation?.trim() ? { name: a.name.trim(), organisation: a.organisation.trim() }
    : { name: a.name.trim() }));
  if (patch.interviews) h.interviews = patch.interviews.map((i) => ({ code: i.code.trim(), role: i.role.trim(), ...(i.who?.trim() ? { who: i.who.trim() } : {}),
    date: i.date }));
  const ok = KEY.test(h.code) && (AUDIT_STATUSES as readonly string[]).includes(h.status) && DATE.test(h.asOf) && textOk(h.client, 200)
    && textOk(h.scope, 4000) && h.auditors.every(auditorOk) && h.interviews.every(interviewOk)
    && new Set(h.interviews.map((i) => i.code)).size === h.interviews.length;
  return ok ? h : null;
}

/** Set the audit header (created on first edit: code `AUDIT-1`, status planned, as of `today`). */
export function setAuditHeader(d: XDocument, patch: HeaderPatch, today: string): XDocument {
  const h = patchedHeader(readAudit(d).header, patch, { code: 'AUDIT-1', asOf: today });
  return h ? onCollaboration(d, (c) => withExtChild(c, 'auditHeader', headerXml(h))) : d;
}

/**
 * One operation on the audit of a programme activity (SPEC_FIXES FX-21, F-B69): the programme process is derived, so its audits are kept in the
 * collaboration (`ac:programmeAudit`, one `ac:audit element="…"` per activity). `known`: the programme activity ids. Calibration does not apply.
 */
export function editProgrammeAudit(d: XDocument, id: string, op: ElementOp, known: ReadonlySet<string>): XDocument {
  if (!known.has(id)) return d;
  const all = readAudit(d).elements, next = applyElementOp(all.get(id) ?? emptyAudit(id), op, resourceIds(d));
  if (!next) return d;
  const items = [...known].flatMap((k) => {
    const a = k === id ? next : all.get(k), x = a && auditXml(a);
    return x ? [withAttrs(x, { element: k })] : [];
  });
  return onCollaboration(d, (c) => withExtChild(c, 'programmeAudit', items.length ? el('ac:programmeAudit', {}, items) : null));
}

/** The document with these audits laid on their elements (a product's own audits, FX-D6: the view the Audit section and calibration read). */
export function withElementAudits(d: XDocument, audits: ReadonlyMap<string, ElementAudit>): XDocument {
  if (!audits.size) return d;
  let root = d.root;
  for (const [id, a] of audits) root = editById(root, id, (e) => (isAudited(e) ? withExtChild(e, 'audit', auditXml(a)) : e));
  return same(d, root);
}
