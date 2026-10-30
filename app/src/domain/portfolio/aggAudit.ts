/** @calc-zone aggregate-views */
import { activityAudits, coverage, readAudit, toolingMap } from '../audit';
import { base, productCases, type AggBase } from './aggScopeRows';
import type { Portfolio } from './types';

/**
 * Section "🔎 Audit" (phase B7, F-B30), aggregate view: each product's audit in counts — coverage of its in-scope activities (by count and by
 * effort), its tooling gaps and overlaps, its pain points and calibrations; then the capabilities across the selection. The audit lives in the
 * product's process document (common, or its own when it overrides the process). Counts only, no figure.
 */
export interface AuditRow extends AggBase {
  own: boolean; status: string; inScope: number; audited: number; byEffort: number; gaps: number; overlaps: number; pains: number; calibrations: number;
}
export interface CapabilityAgg { capability: string; products: number; gaps: number; tools: string[] }
export interface AuditAgg { rows: AuditRow[]; capabilities: CapabilityAgg[]; audited: number }

export function scopeAudit(pf: Portfolio, ids: string[]): AuditAgg {
  const caps = new Map<string, CapabilityAgg>();
  const rows = productCases(pf, ids).map((p) => {
    const d = p.c.BPMN, a = readAudit(d), acts = activityAudits(d), cov = coverage(acts), map = toolingMap(d, acts);
    for (const m of map) {
      const c = caps.get(m.capability) ?? { capability: m.capability, products: 0, gaps: 0, tools: [] };
      c.products++;
      if (m.gap) c.gaps++;
      for (const t of m.tools) if (!c.tools.includes(t)) c.tools.push(t);
      caps.set(m.capability, c);
    }
    return { ...base(p), own: p.overridden('BPMN'), status: a.header?.status ?? '', inScope: cov.inScope, audited: cov.audited, byEffort: cov.byEffort,
      gaps: map.filter((m) => m.gap).length, overlaps: map.filter((m) => m.overlap).length,
      pains: [...a.elements.values()].reduce((t, e) => t + e.painPoints.length, 0), calibrations: a.header?.calibrations.length ?? 0 };
  });
  return { rows, capabilities: [...caps.values()].sort((x, y) => x.capability.localeCompare(y.capability)), audited: rows.filter((r) => r.audited > 0).length };
}
