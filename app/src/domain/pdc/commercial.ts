/** @calc-zone delivery-views */
import { authRank } from '../authority';
import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { engagementKey } from '../engagement';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import type { ModelResult } from '../types/model';

export type CmCode = 'ET' | 'AAH' | 'AGS' | 'GS';
export const CM_CODES: CmCode[] = ['ET', 'AAH', 'AGS', 'GS'];

export const CM_DEFS: Record<CmCode, { label: string; why?: string; need?: (k: string) => boolean }> = {
  ET: { label: 'Effort & Tools' },
  AAH: { label: 'AI-Augmented Humans' },
  AGS: { label: 'Agentshore — mixed teams', need: (k) => k !== 'STA', why: 'requires a managed service (MSC/MSI)' },
  GS: { label: 'Gain sharing', need: (k) => k === 'MSC', why: 'requires full delivery control (MSC)' },
};

export const cmAvailable = (c: Ctx, code: CmCode): boolean => { const n = CM_DEFS[code].need; return !n || n(engagementKey(c)); };


/** Effort share of the in-scope artefacts by AI-authorisation tier: T0 (<= A2), T1 (A3), T2 (A4). */
export function cmTierSplit(c: Ctx): { t0: number; t1: number; t2: number } {
  let w0 = 0, w1 = 0, w2 = 0, tot = 0;
  for (const a of activeArtefacts(c.a, c.s)) {
    const w = +a.w || 0, lv = authRank(a.aiAuth);
    tot += w;
    if (lv <= 2) w0 += w; else if (lv === 3) w1 += w; else w2 += w;
  }
  return tot > 0 ? { t0: w0 / tot, t1: w1 / tot, t2: w2 / tot } : { t0: 1, t1: 0, t2: 0 };
}

const num = (c: Ctx, id: string, dflt: number): number => { const v = c.inp.p(id); return isNaN(v) ? dflt : v; };
/** The AGS vFTE billing ratio (input cmVfteRatio, 0.6 when blank): the share of agent capacity billed. */
export const cmVfteRatioOf = (c: Ctx): number => num(c, 'cmVfteRatio', 0.6);
/** The recommendation thresholds: MSI sells AGS above a 15 % vFTE share, MSC sells GS from a 70 % Monte Carlo confidence. */
export const CM_RULE = { msiVfteShare: 0.15, mscConfidence: 0.7 } as const;
/** The recommendation rule in words (the Commercial screen states it). */
export const cmRuleText = (): string => `STA→AAH · MSI→AGS if vFTE share at horizon end > ${Math.round(CM_RULE.msiVfteShare * 100)}% else ET · MSC→GS if MC `
  + `confidence ≥ ${Math.round(CM_RULE.mscConfidence * 100)}% else AGS`;
/** Monte Carlo confidence of a run: 1 − P(net < 0), null when nothing was run. */
export const mcConfidenceOf = (run: { stats: { pNetNeg: number } } | null | undefined): number | null => (run ? 1 - run.stats.pNetNeg : null);

/** Client revenue per year of the horizon for one commercial model, and the Agentshore capacity-point price. */
export function commercialRevenue(c: Ctx, code: CmCode, m: ModelResult): { rev: number[]; pp: number } {
  const wd = m.wd, tjm = m.tgtTJM, uplift = num(c, 'cmUplift', 15), mk = num(c, 'cmToolMarkup', 10), ratio = cmVfteRatioOf(c);
  let pp = c.inp.p('cmPricePoint'); if (isNaN(pp) || pp <= 0) pp = Math.round((tjm * wd) / 12);
  const disc = num(c, 'cmBaseDisc', 20), gs = num(c, 'cmGainShare', 40);
  const rev = engineNow(c).years().map((y) => {
    const hum = y.totalHumanFteEnd, passThru = y.tokenCost + y.infrastructureCost + y.knowledgeHubCost;
    if (code === 'ET') return hum * tjm * wd + passThru * (1 + mk / 100);
    if (code === 'AAH') return hum * tjm * wd * (1 + uplift / 100);
    if (code === 'AGS') return (hum + y.agentVfteEnd * ratio) * 12 * pp;
    return m.baselineRun * (1 - disc / 100) + Math.max(0, y.savings) * gs / 100;
  });
  return { rev, pp };
}

/** Recommended model [code, reason]. `mcConfidence` = 1 - P(net < 0) of the last Monte Carlo run, or null when none was run. */
export function cmRecommend(c: Ctx, mcConfidence: number | null = null): [CmCode, string] {
  const k = engagementKey(c);
  if (k === 'STA') return ['AAH', 'uplifted day-rate is the only agentic capture in staff augmentation'];
  const ys = engineNow(c).years(), e = ys[ys.length - 1]!, tot = e.humanFteEnd + e.agentVfteEnd, share = tot > 0 ? e.agentVfteEnd / tot : 0;
  if (k === 'MSI') return share > CM_RULE.msiVfteShare ? ['AGS', 'vFTE share at horizon end > 15% — capacity pricing captures the mix'] : ['ET',
    'vFTE share still low — stay on effort & tools'];
  if (mcConfidence != null && mcConfidence >= CM_RULE.mscConfidence) return ['GS', 'MSC + Monte Carlo confidence ≥ 70% — share the upside'];
  return ['AGS', 'MSC but confidence not yet proven — price the capacity, revisit GS after the pilot'];
}

export interface CmRow { code: CmCode; available: boolean; revenue: number; cost: number; margin: number; marginPct: number; tco: number; clientSaving: number }
export interface CmView { rows: CmRow[]; horizon: number; run: number; billableSetup: number; absorbed: number; ppAgs: number; breakEvenUplift: number }

/** The comparison table of the four commercial models (legacy renderCommercial). */
export function commercialView(c: Ctx): CmView {
  const m = model(c), ys = engineNow(c).years(), H = ys.length;
  const run = ys.reduce((a, y) => a + y.totalRunCost, 0), base = m.baselineRun * H, billable = m.setupTotal * m.conv.ctx.setupBillable;
  const rows = CM_CODES.map((code): CmRow => {
    if (!cmAvailable(c, code)) return { code, available: false, revenue: 0, cost: 0, margin: 0, marginPct: 0, tco: 0, clientSaving: 0 };
    const R = commercialRevenue(c, code, m).rev.reduce((a, b) => a + b, 0), margin = R - run - billable;
    return { code, available: true, revenue: R, cost: run + billable, margin, marginPct: R > 0 ? (margin / R) * 100 : 0, tco: R,
      clientSaving: base > 0 ? (1 - R / base) * 100 : 0 };
  });
  const humDays = ys.reduce((a, y) => a + y.totalHumanFteEnd * m.tgtTJM * m.wd, 0);
  return { rows, horizon: H, run, billableSetup: billable, absorbed: m.conv.setupAbsorbed, ppAgs: commercialRevenue(c, 'AGS', m).pp,
    breakEvenUplift: humDays > 0 ? ((run + billable) / humDays - 1) * 100 : 0 };
}
