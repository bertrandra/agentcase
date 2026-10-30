import { editCatalog, editElementAudit, setAuditHeader, type ElementOp } from '@/domain/audit';
import type { XDocument } from '@/domain/process';

/**
 * A reference audit (docs/SPEC_BPMN.md § 15.3, phase B7): header, tools in use, observations per activity and per role (D-B13), a pain point,
 * evidence, and an observation on a role resource. Written with the domain's audit commands on any process document holding A017, A023 and role-dev.
 */
export const AUDITED = ['A017', 'A023', 'role-dev'] as const;
const prov = { source: 'interview' as const, date: '2026-10-20', confidence: 'medium' as const };
const obs = (name: string, value: string, more: object = {}): ElementOp => ({ kind: 'observation', obs: { name, value, ...prov, ...more } });

export const AUDIT_OPS: [string, ElementOp][] = [
  ['A017', { kind: 'tool', use: { ref: 'github-copilot', aiFeatures: 'production', integration: ['api', 'mcp'], licenceCount: 40, ...prov } }],
  ['A017', { kind: 'tool', use: { ref: 'vscode', hosting: 'onPremise' } }],
  ['A017', obs('effortPerItem', '6', { role: 'role-dev' })],
  ['A017', obs('effortPerItem', '2', { role: 'role-arch' })],
  ['A017', obs('itemsPerPeriod', '10', { per: 'sprint' })],
  ['A017', obs('automationLevel', 'pipeline')],
  ['A017', obs('reworkRate', '20')],
  ['A017', obs('fteShare', '25', { role: 'role-dev' })],
  ['A017', { kind: 'painPoint', point: { text: 'Specs arrive late', severity: 4, aiCandidate: 'yes' } }],
  ['A017', { kind: 'evidence', evidence: { name: 'Sprint report 12', link: 'https://example.org/r/12', interview: 'INT-1', confidence: 'high' } }],
  ['A023', obs('effortPerItem', '1.5')],
  ['A023', obs('itemsPerPeriod', '40', { per: 'month' })],
  ['A023', { kind: 'status', status: 'closed', asOf: '2026-10-20' }],
  ['role-dev', obs('workload', '0.9')],
];

/** The document with the reference audit (header, observations); `ops` default to `AUDIT_OPS`. */
export function auditedDoc(d: XDocument, ops: [string, ElementOp][] = AUDIT_OPS): XDocument {
  const h = setAuditHeader(d, { code: 'AUD-7', client: 'Acme', status: 'inProgress', asOf: '2026-10-20', auditors: [{ name: 'Lead auditor' }],
    interviews: [{ code: 'INT-1', role: 'Dev lead', date: '2026-10-15' }] }, '2026-10-20');
  return ops.reduce((x, [id, op]) => editElementAudit(x, id, op), h);
}

/** A client-specific tool for the catalogue tests. */
export const withBench = (d: XDocument): XDocument => editCatalog(d, { kind: 'upsert', tool: { code: 'bench', name: 'In-house bench', capabilities: ['Test'],
  licence: [], aiFeatures: [], integration: ['manual'], hosting: [], clientSpecific: true, retired: false } });
