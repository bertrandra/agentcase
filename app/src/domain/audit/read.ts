/** @calc-zone process-model */
import { collaborationOf } from '../org/readUnits';
import { attr, kid, kids, NS, textOf, type XDocument, type XElement } from '../process/xml';
import {
  AUDIT_STATUSES, CONFIDENCES, PERIODS, SOURCES, YES_NO_LATER, AI_USES, type AuditHeader, type AuditModel, type AuditStatus, type CalibrationEntry,
  type CatalogTool, type ElementAudit, type Observation, type Provenance, type ToolUse,
} from './types';

/**
 * Reads the audit of a process document (F-B27): the header and its calibration log, the case's catalogue entries, and the `ac:audit` of every
 * element carrying one (tasks and resources). Unknown enumeration values are dropped (a foreign or damaged file), never invented. Memoised on
 * the document (the tree is immutable).
 */
const oneOf = <T extends string>(list: readonly T[], v: string | undefined): T | undefined =>
  ((list as readonly string[]).includes(v ?? '') ? v as T : undefined);
const list = (v: string | undefined): string[] => (v ?? '').split(/\s+/).filter(Boolean);
const opt = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;
const numOf = (v: string | undefined): number | undefined => (v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));

const provenance = (e: XElement): Provenance =>
  opt({ source: oneOf(SOURCES, attr(e, 'source')), date: attr(e, 'date'), confidence: oneOf(CONFIDENCES, attr(e, 'confidence')) });

export function toolUseOf(e: XElement): ToolUse {
  const integration = list(attr(e, 'integration'));
  return opt({ ref: attr(e, 'ref') ?? '', version: attr(e, 'version'), edition: attr(e, 'edition'), licenceCount: numOf(attr(e, 'licenceCount')),
    hosting: attr(e, 'hosting'), integration: integration.length ? integration : undefined, aiFeatures: oneOf(AI_USES, attr(e, 'aiFeatures')),
    dataResidency: attr(e, 'dataResidency'), ownerTeam: attr(e, 'ownerTeam'), ...provenance(e) });
}
const observationOf = (e: XElement): Observation => opt({ name: attr(e, 'name') ?? '', value: attr(e, 'value') ?? '', unit: attr(e, 'unit'),
  per: oneOf(PERIODS, attr(e, 'per')), role: attr(e, 'role'), ...provenance(e) });

/** The `ac:audit` element of a task or resource (in its extension elements). */
export function auditElementOf(e: XElement): XElement | undefined {
  const x = kid(e, NS.bpmn, 'extensionElements');
  return x ? kid(x, NS.ac, 'audit') : undefined;
}

export function elementAuditOf(id: string, a: XElement): ElementAudit {
  const byName = (n: string) => kids(a, NS.ac, n);
  return {
    id, ...opt({ status: oneOf(AUDIT_STATUSES, attr(a, 'status')), asOf: attr(a, 'asOf') }),
    tools: byName('tool').map(toolUseOf), observations: byName('observation').map(observationOf),
    painPoints: byName('painPoint').map((p) => opt({ text: textOf(p), severity: numOf(attr(p, 'severity')) ?? 1,
      aiCandidate: oneOf(YES_NO_LATER, attr(p, 'aiCandidate')) })),
    evidence: byName('evidence').map((v) => opt({ name: attr(v, 'name') ?? '', link: attr(v, 'link'), interview: attr(v, 'interview'),
      confidence: oneOf(CONFIDENCES, attr(v, 'confidence')) })),
  };
}

export function catalogToolOf(e: XElement): CatalogTool {
  return { code: attr(e, 'code') ?? '', name: attr(e, 'name') ?? '',
    ...opt({ vendor: attr(e, 'vendor'), category: attr(e, 'category'), asOf: attr(e, 'asOf') }),
    licence: list(attr(e, 'licence')), capabilities: list(attr(e, 'capabilities')), aiFeatures: list(attr(e, 'aiFeatures')),
    integration: list(attr(e, 'integration')), hosting: list(attr(e, 'hosting')), clientSpecific: attr(e, 'clientSpecific') === 'true',
    retired: attr(e, 'retired') === 'true' };
}

const calibrationOf = (c: XElement): CalibrationEntry => ({
  code: attr(c, 'code') ?? '', date: attr(c, 'date') ?? '', ...opt({ source: attr(c, 'source') }),
  changes: kids(c, NS.ac, 'change').map((x) => ({ element: attr(x, 'element') ?? '',
    param: (attr(x, 'param') ?? 'effort') as CalibrationEntry['changes'][number]['param'],
    from: attr(x, 'from') ?? '', to: attr(x, 'to') ?? '', formula: attr(x, 'formula') ?? '' })),
});

function headerOf(h: XElement): AuditHeader {
  return {
    code: attr(h, 'code') ?? '', ...opt({ client: attr(h, 'client'), scope: attr(h, 'scope') }),
    status: oneOf(AUDIT_STATUSES, attr(h, 'status')) ?? ('planned' as AuditStatus), asOf: attr(h, 'asOf') ?? '',
    auditors: kids(h, NS.ac, 'auditor').map((a) => opt({ name: attr(a, 'name') ?? '', organisation: attr(a, 'organisation') })),
    interviews: kids(h, NS.ac, 'interview').map((i) => opt({ code: attr(i, 'code') ?? '', role: attr(i, 'role') ?? '', who: attr(i, 'who'),
      date: attr(i, 'date') ?? '' })),
    calibrations: kids(h, NS.ac, 'calibration').map(calibrationOf),
  };
}

/** The collaboration's extension element `ac:<local>` (the audit header, the case's tool catalogue). */
export function collabExtChild(d: XDocument, local: string): XElement | undefined {
  const c = collaborationOf(d), x = c ? kid(c, NS.bpmn, 'extensionElements') : undefined;
  return x ? kid(x, NS.ac, local) : undefined;
}

function elementsOf(root: XElement): Map<string, ElementAudit> {
  const out = new Map<string, ElementAudit>();
  const walk = (e: XElement): void => {
    for (const c of kids(e)) {
      if (c.ns === NS.bpmn && c.local === 'extensionElements') continue;
      const id = attr(c, 'id'), a = id !== undefined ? auditElementOf(c) : undefined;
      if (a && id !== undefined) out.set(id, elementAuditOf(id, a));
      walk(c);
    }
  };
  walk(root);
  return out;
}

const memo = new WeakMap<XDocument, AuditModel>();
export function readAudit(d: XDocument): AuditModel {
  const hit = memo.get(d);
  if (hit) return hit;
  const h = collabExtChild(d, 'auditHeader'), cat = collabExtChild(d, 'toolCatalog');
  const out: AuditModel = { caseTools: cat ? kids(cat, NS.ac, 'tool').map(catalogToolOf) : [], elements: elementsOf(d.root) };
  if (h) out.header = headerOf(h);
  const asOf = cat ? attr(cat, 'asOf') : undefined;
  if (asOf) out.catalogAsOf = asOf;
  memo.set(d, out);
  return out;
}

/** True when the document holds any audit data (header, catalogue entries or observations): the exports and the snapshot then ask (F-B35). */
export const hasAudit = (d: XDocument): boolean => { const a = readAudit(d); return !!a.header || a.caseTools.length > 0 || a.elements.size > 0; };
