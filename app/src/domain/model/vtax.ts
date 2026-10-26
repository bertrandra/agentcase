/** @calc-zone run-setup-taxes @owner verification-tax */
import { QUAL_ANCHOR } from '../catalog';
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import { evtModel } from './evt';

export function sddMaturity(c: Ctx): number {
  const v = c.inp.p('sddMat');
  return isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
}

/** Effort-weighted mean human-supervision share (0..1) of the artefacts in scope. */
export function vtaxAvgHuman(c: Ctx): number {
  let w = 0, hh = 0;
  activeArtefacts(c.a, c.s).forEach((a) => { const ww = +a.w || 0; w += ww; hh += (ww * (+a.humanSup || 0)) / 100; });
  return w > 0 ? hh / w : 0.5;
}

function vtaxEffBase(c: Ctx): number {
  let base = c.inp.p('vtaxBase'); if (isNaN(base)) base = 0.3;
  return base * (1 - 0.5 * (sddMaturity(c) / 100));
}
const vtaxMode = (c: Ctx) => (c.inp.v('vtaxMode') === 'net' ? 'net' : 'overlay');

function legacyVerificationTaxRate(c: Ctx): number {
  const base = vtaxEffBase(c), avgHuman = vtaxAvgHuman(c);
  const rate = vtaxMode(c) === 'net' ? Math.max(0, base - avgHuman) : base * avgHuman;
  return Math.max(0, Math.min(c.s.COEF.vtaxCap as number, rate));
}

/** The EVT net tax before any clamp: the endogenous rate minus the retained supervision (negative = supervision already covers the review). */
export const evtRawNet = (c: Ctx): number => evtModel(c).rate - vtaxAvgHuman(c);

/** Endogenous (EVT) tax rate: negative net tax is clamped to 0 unless acknowledged. */
function evtEndogenousTaxRate(c: Ctx): number {
  const e = evtModel(c), cap = c.s.COEF.vtaxCap as number, evt = c.s.MODEL.EVT;
  if (evt.mode === 'net') {
    const rawNet = evtRawNet(c);
    if (rawNet < 0) return evt.ackNegativeNet ? Math.min(cap, rawNet) : 0;
    return Math.max(0, Math.min(cap, rawNet));
  }
  return Math.max(0, Math.min(cap, e.rate));
}

export function verificationTaxRate(c: Ctx): number {
  if (!c.inp.c('vtaxApply')) return 0;
  try {
    if (c.s.MODEL.FLAGS.evt === true) return evtEndogenousTaxRate(c);
  } catch { /* fall back like modelStage() */ }
  return legacyVerificationTaxRate(c);
}

function qualKey(c: Ctx): string {
  const v = c.inp.v('qualSeverity') || 'correctness';
  return QUAL_ANCHOR[v] ? v : 'correctness';
}

export function qualPremium(c: Ctx): number {
  if (!c.inp.c('qualApply')) return 0;
  const raw = (QUAL_ANCHOR[qualKey(c)] as { m: number }).m - 1;
  return Math.max(0, raw * (1 - sddMaturity(c) / 100));
}

export const aiQualityTaxFactor = (c: Ctx): number => 1 + Math.min(c.s.COEF.qualPremiumCap as number, qualPremium(c));
