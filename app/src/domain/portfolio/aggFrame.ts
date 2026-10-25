/** @calc-zone aggregate-views */
import { caseDiscountRate } from '../canonical';
import { engagementCoef, engagementKey } from '../engagement';
import { CROSS_CATEGORIES, INDUSTRIES, industryLabel, regGlassCeiling, crossOn } from '../frame/profile';
import { onboardingBand, stageWeeks } from '../frame/onboarding';
import { base, productCases, spread, type AggBase, type Spread } from './aggScopeRows';
import type { Portfolio } from './types';

/** Section "Engagement context": the contractual frame (MSC / MSI / STA) of each product and the coefficients it implies. */
export interface EngagementRow extends AggBase {
  key: string; label: string; own: boolean; maturityCap: number; rampSpeed: number; glassFactor: number; setupBillable: number; riskPremium: number;
    authorityCap: number; khMaxCC: number; discountRate: number;
}
export interface EngagementAgg { rows: EngagementRow[]; contexts: { key: string; count: number }[]; discountRate: Spread | null; discountPct: Spread | null }

export function frameEngagement(pf: Portfolio, ids: string[]): EngagementAgg {
  const count = new Map<string, number>();
  const rows = productCases(pf, ids).map((p) => {
    const k = engagementKey(p.ctx), c = engagementCoef(p.ctx);
    count.set(k, (count.get(k) ?? 0) + 1);
    return { ...base(p), key: k, label: c.label, own: p.overridden('values.engagementCtx'), maturityCap: c.maturityCap, rampSpeed: c.rampSpeed,
      glassFactor: c.glassFactor, setupBillable: c.setupBillable,
      riskPremium: c.riskPremium, authorityCap: c.authorityCap, khMaxCC: c.khMaxCC, discountRate: caseDiscountRate(p.ctx) };
  });
  return { rows, contexts: [...count].map(([key, n]) => ({ key, count: n })), discountRate: spread(rows.map((r) => r.discountRate)),
    discountPct: spread(rows.map((r) => r.discountRate * 100)) };
}

/** Section "Engage": the four onboarding stages of each product and the date the scale-out decision is taken. */
export interface EngageRow extends AggBase { weeks: number[]; totalWeeks: number; months: string; pilotStart: string; decide: string }
export interface EngageAgg { rows: EngageRow[]; totalWeeks: Spread | null; earliestDecide: string; latestDecide: string }

export function frameEngage(pf: Portfolio, ids: string[]): EngageAgg {
  const rows = productCases(pf, ids).map((p) => {
    const b = onboardingBand(p.ctx);
    return { ...base(p), weeks: stageWeeks(p.ctx), totalWeeks: b.totalWeeks, months: b.months, pilotStart: b.pilotStart, decide: b.decide };
  });
  const dates = rows.map((r) => r.decide).sort();
  return { rows, totalWeeks: spread(rows.map((r) => r.totalWeeks)), earliestDecide: dates[0] ?? '', latestDecide: dates[dates.length - 1] ?? '' };
}

/** Section "Industry / regulatory profile": the industry, norms and cross-cutting concerns each product carries. */
export interface IndustryRow extends AggBase { code: string; label: string; regUse: boolean; norms: number; regArtefacts: number; cross: string[];
  regCeiling: number; own: boolean }
export interface IndustryAgg { rows: IndustryRow[]; regulated: number; industries: { code: string; label: string; count: number }[] }

export function frameIndustry(pf: Portfolio, ids: string[]): IndustryAgg {
  const count = new Map<string, number>();
  const rows = productCases(pf, ids).map((p) => {
    const code = p.c.dom.values.industry ?? 'NONE', ind = INDUSTRIES.find((i) => i.code === code), norms = p.c.selectedNorms;
    count.set(code, (count.get(code) ?? 0) + 1);
    return { ...base(p), code, label: ind ? industryLabel(ind) : code, regUse: !!p.c.dom.checked.regUse, norms: norms.length,
      regArtefacts: p.c.selectedRegArtefacts.length,
      cross: CROSS_CATEGORIES.filter((x) => crossOn(norms, x.code)).map((x) => x.code), regCeiling: regGlassCeiling(p.ctx),
        own: p.overridden('selectedNorms') || p.overridden('values.industry') };
  });
  return { rows, regulated: rows.filter((r) => r.regUse && r.code !== 'NONE').length,
    industries: [...count].map(([code, n]) => ({ code, label: INDUSTRIES.find((i) => i.code === code)?.name ?? code, count: n })) };
}
