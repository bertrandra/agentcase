/** @calc-zone verdict */
import type { Ctx } from '../ctx';
import { MCS_DRIVER_ORDER, mcsSpec } from './mcsDrivers';
import { evidenceOf, type EvidenceTier } from './modelState';

export const EVIDENCE_TIERS: Record<EvidenceTier, number> = { MEASURED: 1, BENCHMARK: 0.6, ASSUMPTION: 0.25 };
export const EVL_STAGES = ['qualification', 'investmentApproval', 'gateReview'] as const;
export const EVL_STAGE_LABEL: Record<string, string> = { qualification: 'Qualification', investmentApproval: 'Investment approval', gateReview: 'Gate review' };
const EXPECTED: Record<string, string> = { qualification: 'C', investmentApproval: 'B', gateReview: 'A' };
const GRADE_ORDER = ['D', 'C', 'B', 'A'];
const EIGHTEEN_MONTHS = 548 * 24 * 3600 * 1000;

export interface TornadoRow { id: string; swing: number }

/** A MEASURED tier without a source, or older than ~18 months, counts as BENCHMARK for the grade (CC-EV-02). */
export function effectiveTier(c: Ctx, id: string, now = Date.now()): EvidenceTier {
  const e = evidenceOf(c.s.MODEL).drivers[id];
  if (!e) return 'ASSUMPTION';
  if (e.tier === 'MEASURED') {
    let fresh = true;
    if (e.asOf) { const t = new Date(e.asOf).getTime(); if (!isNaN(t)) fresh = now - t <= EIGHTEEN_MONTHS; }
    if (!(e.source && e.source.trim()) || !fresh) return 'BENCHMARK';
  }
  return e.tier || 'ASSUMPTION';
}

/** Influence weights: the normalised P4 tornado swings; equal weights (flagged) until a run exists. */
function weights(tornado: TornadoRow[] | null) {
  const raw = MCS_DRIVER_ORDER.map((id) => tornado?.find((t) => t.id === id)?.swing ?? 0);
  const total = raw.reduce((s, v) => s + v, 0);
  return { weights: total > 0 ? raw.map((v) => v / total) : MCS_DRIVER_ORDER.map(() => 1 / MCS_DRIVER_ORDER.length), hasTornado: !!tornado };
}

/** Full P6 read-out (legacy evlModel()). `tornado` is the last stochastic run, if any. */
export function evlModel(c: Ctx, tornado: TornadoRow[] | null, now = Date.now()) {
  const ev = evidenceOf(c.s.MODEL), w = weights(tornado);
  let num = 0, den = 0;
  const drivers = MCS_DRIVER_ORDER.map((id, i) => {
    const entry = ev.drivers[id], wt = w.weights[i] as number, eff = effectiveTier(c, id, now);
    if (wt > 0) { num += wt * (EVIDENCE_TIERS[eff] || 0.25); den += wt; }
    return { id, label: mcsSpec(c, id).label || id, weight: wt, tier: (entry?.tier || 'ASSUMPTION') as EvidenceTier, effectiveTier: eff,
      source: entry?.source || '', asOf: entry?.asOf || '', owner: entry?.owner || '' };
  });
  const score = den > 0 ? num / den : null;
  const grade = score == null ? null : score >= 0.8 ? 'A' : score >= 0.6 ? 'B' : score >= 0.4 ? 'C' : 'D';
  const expectedGrade = EXPECTED[ev.stage] || 'C';
  const meets = grade == null ? null : GRADE_ORDER.indexOf(grade) >= GRADE_ORDER.indexOf(expectedGrade);
  const upgradePriority = drivers.map((d) => ({ ...d, priority: d.weight * (EVIDENCE_TIERS.MEASURED - (EVIDENCE_TIERS[d.effectiveTier] || 0.25)) }))
    .filter((r) => r.priority > 1e-9).sort((a, b) => b.priority - a.priority);
  return { on: !!c.s.MODEL.FLAGS.evl, stage: ev.stage, expectedGrade, hasTornado: w.hasTornado, score, grade, meetsExpectation: meets, drivers,
    upgradePriority };
}
