/** @calc-zone exports */
import { caseDiscountRate, engineNow } from './canonical';
import { makeCtx } from './ctx';
import type { CaseState } from './types/state';

/** Schema tag of the package (legacy `materialise()` value). */
export const CALC_PACKAGE_SCHEMA = 'agentcase.calculation.v1';

export interface PackageHeadline { payback: number | null; npv: number; roi: number | null; totalSavings: number }
export interface PackageYear { yearIndex: number; savings: number; totalRunCost: number; netAfterSetup: number; cumulativeCashFlowEnd: number }
/** The canonical calculation package a saved case carries: engine identity plus the key canonical figures. */
export interface CalcPackage {
  schemaVersion: typeof CALC_PACKAGE_SCHEMA; calculationVersion: string; inputHash: string; curveModelId: string;
  headline: PackageHeadline; annual: PackageYear[];
}

/** Build the package of a case from the live engine (legacy `teEngineNow().materialise()`, without the bulky monthly rows). */
export function buildCalcPackage(state: CaseState): CalcPackage {
  const c = makeCtx(state), e = engineNow(c), h = e.headline(caseDiscountRate(c));
  return {
    schemaVersion: CALC_PACKAGE_SCHEMA, calculationVersion: e.K.calculationVersion, inputHash: e.K.inputHash, curveModelId: e.K.curveModelId,
    headline: { payback: h.payback, npv: h.npv, roi: h.roi, totalSavings: h.totalSavings },
    annual: e.years().map((y) => ({ yearIndex: y.yearIndex, savings: y.savings, totalRunCost: y.totalRunCost, netAfterSetup: y.netAfterSetup,
      cumulativeCashFlowEnd: y.cumulativeCashFlowEnd })),
  };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNumOrNull = (v: unknown): v is number | null => v === null || isNum(v);
const rec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Shape check of a package read from a file: anything that is not exactly a package is rejected (null). */
export function parseCalcPackage(v: unknown): CalcPackage | null {
  if (!rec(v) || !rec(v.headline) || !Array.isArray(v.annual)) return null;
  const h = v.headline;
  if (typeof v.calculationVersion !== 'string' || typeof v.inputHash !== 'string' || typeof v.curveModelId !== 'string') return null;
  if (!isNumOrNull(h.payback) || !isNum(h.npv) || !isNumOrNull(h.roi) || !isNum(h.totalSavings)) return null;
  const rows = v.annual.every((y) => rec(y) && isNum(y.yearIndex) && isNum(y.savings) && isNum(y.totalRunCost) && isNum(y.netAfterSetup)
    && isNum(y.cumulativeCashFlowEnd));
  return rows ? (v as unknown as CalcPackage) : null;
}
