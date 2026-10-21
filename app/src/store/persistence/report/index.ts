import type { CaseState } from '@/domain';
import { reportBlocker, reportData } from './data';
import { renderReport } from './render';

export { reportBlocker, reportData, type ReportData } from './data';
export { esc, renderReport } from './render';

export type ReportResult = { ok: true; filename: string; html: string; norms: number; artefacts: number } | { ok: false; reason: string };

/** The Critical & Regulated Software Delivery report of a case as a standalone HTML file (legacy exportCriticalReport). */
export function buildCriticalReport(s: CaseState, now: Date = new Date()): ReportResult {
  const reason = reportBlocker(s);
  if (reason) return { ok: false, reason };
  const d = reportData(s, now);
  return { ok: true, filename: `AgentCase_Critical_Regulated_Report_${d.stamp.replace(/-/g, '')}.html`, html: renderReport(d), norms: d.norms.length, artefacts: d.artefactsInScope };
}
