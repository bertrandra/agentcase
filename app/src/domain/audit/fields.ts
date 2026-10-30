/** @calc-zone process-model */
/**
 * The fields of the operational and technical audit (docs/SPEC_BPMN.md § 15.3), one per `ac:observation name`. Every field is optional and
 * carries its own source and date. `perRole`: the value may be split per role (D-B13, `ac:observation role`). The tools in use, the pain points
 * and the evidence have their own elements (`ac:tool`, `ac:painPoint`, `ac:evidence`).
 */
export type FieldKind = 'number' | 'percent' | 'choice' | 'text';
export interface AuditField {
  name: string; block: AuditBlock; label: string; kind: FieldKind; unit?: string; options?: readonly string[]; perRole?: boolean; period?: boolean;
}
export const AUDIT_BLOCKS = ['readiness', 'volume', 'time', 'quality', 'flow', 'people', 'opportunity'] as const;
export type AuditBlock = (typeof AUDIT_BLOCKS)[number];
export const BLOCK_LABELS: Record<AuditBlock, string> = {
  readiness: 'Technical readiness', volume: 'Volume and frequency', time: 'Time', quality: 'Quality and rework', flow: 'Flow', people: 'People',
  opportunity: 'Pain points and opportunities',
};
export const AUTOMATION_LEVELS = ['none', 'scripted', 'pipeline', 'agentic'] as const;

const f = (block: AuditBlock, name: string, label: string, kind: FieldKind, more: Partial<AuditField> = {}): AuditField =>
  ({ name, block, label, kind, ...more });
export const AUDIT_FIELDS: readonly AuditField[] = [
  f('readiness', 'automationLevel', 'Automation level today', 'choice', { options: AUTOMATION_LEVELS }),
  f('readiness', 'dataAvailability', 'Data availability for agents', 'choice', { options: ['structured', 'semi', 'none'] }),
  f('readiness', 'apiAccess', 'API access to the tool', 'choice', { options: ['yes', 'partial', 'no'] }),
  f('readiness', 'aiConstraint', 'Security or regulatory constraint on AI use (text + norm)', 'text'),
  f('readiness', 'qualitySignal', 'Test coverage or quality signal', 'text'),
  f('volume', 'itemsPerPeriod', 'Items per period', 'number', { unit: 'items', period: true }),
  f('volume', 'frequency', 'Frequency', 'choice', { options: ['day', 'week', 'sprint', 'month', 'quarter', 'release', 'year', 'project'] }),
  f('volume', 'batchSize', 'Batch size', 'number', { unit: 'items' }),
  f('time', 'effortPerItem', 'Effort per item', 'number', { unit: 'person-hours', perRole: true }),
  f('time', 'cycleTime', 'Cycle time', 'number', { unit: 'days' }),
  f('time', 'waitingTime', 'Waiting time', 'number', { unit: 'days' }),
  f('time', 'fteShare', 'Share of FTE of the role on the activity', 'percent', { unit: '%', perRole: true }),
  f('quality', 'reworkRate', 'Rework rate', 'percent', { unit: '%' }),
  f('quality', 'defectEscape', 'Defect escape', 'percent', { unit: '%' }),
  f('quality', 'firstPassYield', 'First-pass yield', 'percent', { unit: '%' }),
  f('quality', 'reviewRounds', 'Review rounds', 'number'),
  f('flow', 'handoffs', 'Hand-offs (to which roles / activities)', 'text'),
  f('flow', 'approvals', 'Approvals', 'number'),
  f('flow', 'blockingDependencies', 'Blocking dependencies', 'text'),
  f('flow', 'toolingBreaks', 'Tooling breaks (manual copy between tools)', 'number'),
  f('people', 'headcount', 'Headcount involved', 'number', { perRole: true }),
  f('people', 'skillGaps', 'Skill gaps', 'text', { perRole: true }),
  f('people', 'workload', 'Workload (share of an FTE)', 'number', { unit: 'FTE share' }),
  f('people', 'changeAppetite', 'Change appetite', 'choice', { options: ['low', 'medium', 'high'] }),
  f('opportunity', 'auditorNote', "Auditor's note", 'text'),
];
export const FIELD_BY_NAME: ReadonlyMap<string, AuditField> = new Map(AUDIT_FIELDS.map((x) => [x.name, x]));

/** A value checked against its field: a number for number / percent fields (percent 0–100), one of the options for a choice; null = refused. */
export function checkValue(name: string, raw: string): string | null {
  const fd = FIELD_BY_NAME.get(name), v = raw.trim();
  if (!v || v.length > 4000) return null;
  if (!fd || fd.kind === 'text') return v;
  if (fd.kind === 'choice') return fd.options?.includes(v) ? v : null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || (fd.kind === 'percent' && n > 100)) return null;
  return String(n);
}
