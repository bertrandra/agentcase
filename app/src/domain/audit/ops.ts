/** @calc-zone process-model */
import { checkValue, FIELD_BY_NAME } from './fields';
import {
  AI_USES, AUDIT_STATUSES, CONFIDENCES, HOSTINGS, INTEGRATIONS, PERIODS, SOURCES, YES_NO_LATER, type AuditStatus, type ElementAudit, type EvidenceRef,
  type Observation, type PainPoint, type ToolUse,
} from './types';

/**
 * What one audit command does to the audit of one task or resource (§ 15.3), as a pure function of the current audit. Every value is checked
 * against the extension XSD (keys, dates, enumerations, numbers); a refused operation returns null and the command changes nothing.
 */
export type ElementOp =
  | { kind: 'tool'; use: ToolUse } | { kind: 'removeTool'; ref: string }
  | { kind: 'observation'; obs: Observation } | { kind: 'removeObservation'; name: string; role?: string }
  | { kind: 'painPoint'; point: PainPoint } | { kind: 'removePainPoint'; index: number }
  | { kind: 'evidence'; evidence: EvidenceRef } | { kind: 'removeEvidence'; index: number }
  | { kind: 'status'; status?: AuditStatus; asOf?: string };

export const KEY = /^[A-Za-z0-9_][A-Za-z0-9_.:/+ ()-]{0,79}$/;
export const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const inList = (list: readonly string[], v: string | undefined): boolean => v === undefined || list.includes(v);
const name = (v: string | undefined): boolean => v === undefined || (v.trim().length > 0 && v.length <= 200);
const date = (v: string | undefined): boolean => v === undefined || DATE.test(v);
const provenanceOk = (p: { source?: string; date?: string; confidence?: string }): boolean =>
  inList(SOURCES, p.source) && date(p.date) && inList(CONFIDENCES, p.confidence);
/** Undefined fields left out, so the typed view and the element written are the same object shape (`toStrictEqual` after a read). */
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;

export function toolUseOk(t: ToolUse): boolean {
  return KEY.test(t.ref) && name(t.version) && name(t.edition) && name(t.dataResidency) && (t.ownerTeam === undefined || KEY.test(t.ownerTeam))
    && (t.licenceCount === undefined || (Number.isInteger(t.licenceCount) && t.licenceCount >= 0)) && inList(HOSTINGS, t.hosting)
    && (t.integration ?? []).every((i) => (INTEGRATIONS as readonly string[]).includes(i)) && inList(AI_USES, t.aiFeatures) && provenanceOk(t);
}

/** An observation as it will be written (value normalised by its field), or null when refused. `roles`: the resource ids of the document. */
export function observationOk(o: Observation, roles: ReadonlySet<string>): Observation | null {
  const value = checkValue(o.name, o.value), fd = FIELD_BY_NAME.get(o.name);
  if (value === null || !KEY.test(o.name) || !name(o.unit) || !inList(PERIODS, o.per) || !provenanceOk(o)) return null;
  if (o.role !== undefined && (!roles.has(o.role) || (fd && !fd.perRole))) return null;
  return clean({ ...o, value, unit: o.unit ?? fd?.unit });
}

const sameObs = (a: Observation, n: string, role: string | undefined): boolean => a.name === n && a.role === role;

/** The audit after `op`, or null when refused. `roles` are the resource ids an observation may name (per-role split, D-B13). */
export function applyElementOp(a: ElementAudit, op: ElementOp, roles: ReadonlySet<string>): ElementAudit | null {
  switch (op.kind) {
    case 'tool': {
      if (!toolUseOk(op.use)) return null;
      const use = clean(op.use), i = a.tools.findIndex((t) => t.ref === use.ref);
      return { ...a, tools: i < 0 ? [...a.tools, use] : a.tools.map((t, j) => (j === i ? use : t)) };
    }
    case 'removeTool': return a.tools.some((t) => t.ref === op.ref) ? { ...a, tools: a.tools.filter((t) => t.ref !== op.ref) } : null;
    case 'observation': {
      const o = observationOk(op.obs, roles);
      if (!o) return null;
      const i = a.observations.findIndex((x) => sameObs(x, o.name, o.role));
      return { ...a, observations: i < 0 ? [...a.observations, o] : a.observations.map((x, j) => (j === i ? o : x)) };
    }
    case 'removeObservation': {
      const rest = a.observations.filter((x) => !sameObs(x, op.name, op.role));
      return rest.length === a.observations.length ? null : { ...a, observations: rest };
    }
    case 'painPoint': {
      const p = op.point, ok = p.text.trim() && p.text.length <= 4000 && Number.isInteger(p.severity) && p.severity >= 1 && p.severity <= 5;
      return ok && inList(YES_NO_LATER, p.aiCandidate) ? { ...a, painPoints: [...a.painPoints, clean({ ...p, text: p.text.trim() })] } : null;
    }
    case 'removePainPoint': return a.painPoints[op.index] ? { ...a, painPoints: a.painPoints.filter((_, j) => j !== op.index) } : null;
    case 'evidence': {
      const v = op.evidence, ok = name(v.name) && v.name.trim() && (v.interview === undefined || KEY.test(v.interview)) && inList(CONFIDENCES, v.confidence)
        && (v.link === undefined || (v.link.length <= 2000 && !/[\s<>"]/.test(v.link)));
      return ok ? { ...a, evidence: [...a.evidence, clean({ ...v, name: v.name.trim() })] } : null;
    }
    case 'removeEvidence': return a.evidence[op.index] ? { ...a, evidence: a.evidence.filter((_, j) => j !== op.index) } : null;
    case 'status': {
      if (!inList(AUDIT_STATUSES, op.status) || !date(op.asOf)) return null;
      const next: ElementAudit = { ...a, ...clean({ status: op.status, asOf: op.asOf }) };
      if (!op.status) delete next.status;
      if (!op.asOf) delete next.asOf;
      return next;
    }
  }
}

/** An empty audit of an element (no observation yet). */
export const emptyAudit = (id: string): ElementAudit => ({ id, tools: [], observations: [], painPoints: [], evidence: [] });
