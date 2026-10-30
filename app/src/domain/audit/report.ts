/** @calc-zone process-model */
import type { XDocument } from '../process/xml';
import { activityAudits, coverage, phaseProgress, toolingMap, type ActivityAudit, type CapabilityRow, type Coverage, type PhaseProgress } from './analysis';
import { catalogUpdated, effectiveCatalog, SHIPPED_AS_OF } from './catalog';
import { readAudit } from './read';
import type { AuditHeader, CalibrationEntry } from './types';

/**
 * Everything the audit report prints (F-B34) and the results workbook's Audit and Tooling sheets read: header, coverage, progress per phase,
 * tooling map, observed versus modelled, the top pain points and the calibration log. One owner: the outputs format, they never recompute.
 */
export interface PainRow { activity: string; name: string; severity: number; aiCandidate: string; text: string }
export interface ToolRow { activity: string; name: string; capability: string; tool: string; toolName: string; aiFeatures: string; integration: string }
export interface AuditReport {
  header?: AuditHeader; coverage: Coverage; phases: PhaseProgress[]; tooling: CapabilityRow[]; observed: ActivityAudit[]; pains: PainRow[];
  tools: ToolRow[]; calibrations: CalibrationEntry[]; catalogAsOf: string; catalogUpdated: boolean;
}

/** Observed rows: the in-scope activities that hold an observed value to compare (hours, rework, automation or an FTE share). */
const compared = (r: ActivityAudit): boolean => r.inScope && (r.hoursPerMonth !== null || r.reworkRate !== null || !!r.automation || r.fte.length > 0);

export function auditReport(d: XDocument, topPains = 10): AuditReport {
  const a = readAudit(d), rows = activityAudits(d), cat = new Map(effectiveCatalog(a).map((t) => [t.code, t])), names = new Map(rows.map((r) => [r.id, r]));
  const pains = [...a.elements.values()].flatMap((e) => e.painPoints.map((p) => ({ activity: e.id, name: names.get(e.id)?.name ?? e.id, severity: p.severity,
    aiCandidate: p.aiCandidate ?? '', text: p.text })))
    .sort((x, y) => y.severity - x.severity || x.activity.localeCompare(y.activity)).slice(0, topPains);
  const tools = rows.filter((r) => r.inScope).flatMap((r) => (a.elements.get(r.id)?.tools ?? []).map((t) => ({ activity: r.id, name: r.name,
    capability: r.capability, tool: t.ref, toolName: cat.get(t.ref)?.name ?? t.ref, aiFeatures: t.aiFeatures ?? '',
    integration: (t.integration ?? []).join(' ') })));
  const out: AuditReport = { coverage: coverage(rows), phases: phaseProgress(d, rows), tooling: toolingMap(d, rows), observed: rows.filter(compared), pains,
    tools, calibrations: a.header?.calibrations ?? [], catalogAsOf: a.catalogAsOf ?? SHIPPED_AS_OF, catalogUpdated: catalogUpdated(a) };
  if (a.header) out.header = a.header;
  return out;
}
