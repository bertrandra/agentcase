/** @calc-zone exports */
import { activeArtefacts, engineNow, makeCtx, model, REG_ARTEFACTS, regActive } from '@/domain';
import { engagementCoef, engagementKey } from '@/domain/engagement';
import { posture } from '@/domain/verifyA/phaseArt';
import { appVerTag } from '@/domain/snapshots';
import type { CaseState } from '@/domain';
import { logoAlt, shownLogo } from '@/domain/theme/logo';

const AUTH_ORDER: Record<string, number> = { Assistance: 1, Copilot: 2, 'Supervised autonomous': 3, Autonomous: 4 };

export interface ReportData {
  version: string; stamp: string; context: string;
  norms: string[]; artefactsInScope: number; catalogueSize: number;
  potential: number; ceiling: number; effective: number; headroom: number;
  supervision: { phase: string; floor: number; posture: string }[];
  authorityCap: number; blocked: { name: string; phase: string; aiAuth: string }[];
  setup: number; billablePct: number; endLabel: string; endRun: number; endSaving: number; baselineRun: number; riskPremium: number;
  /** the customer logo of a client presentation (docs/THEME.md §8.6); absent: the report is the legacy one, byte for byte */
  logo?: { src: string; alt: string };
}
/** The logo block of a case (none when it has no logo or hides it). */
export function reportLogo(s: object): { logo?: { src: string; alt: string } } {
  const d = s as Record<string, unknown>, l = shownLogo(d);
  return l ? { logo: { src: l.src, alt: logoAlt(String(d.customerName ?? '')) } } : {};
}

/** The report needs the regulatory catalogue switched on and at least one norm selected (the legacy gate). */
export const reportBlocker = (s: CaseState & { regUse?: boolean }): string | null =>
  !s.regUse || !s.selectedNorms?.length ? 'Enable the Regulatory catalog and select at least one norm first (Parameters).' : null;

/** Every figure of the Critical & Regulated Software Delivery report, computed from the case (legacy exportCriticalReport). */
export function reportData(s: CaseState, now: Date): ReportData {
  const c = makeCtx(s), m = model(c), k = engagementKey(c), cx = engagementCoef(c), eng = engineNow(c), end = eng.year(eng.horizonYears);
  const by = new Map<string, { w: number; h: number }>();
  const act = activeArtefacts(c.a, c.s);
  act.forEach((a) => { const p = a.phase || '—', o = by.get(p) ?? { w: 0, h: 0 }, w = +a.w || 0; o.w += w; o.h += w * a.humanSup; by.set(p, o); });
  const supervision = [...by.keys()].sort().flatMap((phase) => { const o = by.get(phase)!; return o.w > 0 ? [{ phase, floor: o.h / o.w, posture: posture(o.h / o.w) }] : []; });
  const sel = new Set(s.selectedRegArtefacts);
  return {
    version: appVerTag(), stamp: now.toISOString().slice(0, 10), context: k,
    norms: [...s.selectedNorms].sort(), artefactsInScope: regActive(c.a, c.s).filter((a) => sel.has(a.id)).length, catalogueSize: REG_ARTEFACTS.length,
    potential: m.auto, ceiling: m.ceiling, effective: m.eff, headroom: m.conv.effCap,
    supervision, authorityCap: cx.authorityCap,
    blocked: act.filter((a) => (AUTH_ORDER[a.aiAuth] ?? 1) > cx.authorityCap).map((a) => ({ name: a.name, phase: a.phase, aiAuth: a.aiAuth })),
    setup: m.setupTotal, billablePct: cx.setupBillable * 100, endLabel: `Y${eng.horizonYears}`, endRun: end.totalRunCost, endSaving: end.savings,
    baselineRun: m.baselineRun, riskPremium: cx.riskPremium, ...reportLogo(s),
  };
}
