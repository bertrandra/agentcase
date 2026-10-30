/** @calc-zone verdict */
import type { Ctx } from '../ctx';
import { auditEvidence, type AuditDriverEvidence } from './auditEvidence';
import { EVIDENCE_TIERS, stale, strongerTier, type EvalDate } from './evidenceTiers';
import { MCS_DRIVER_ORDER, mcsSpec } from './mcsDrivers';
import { evidenceOf, type EvidenceTier } from './modelState';

export { EVIDENCE_TIERS, type EvalDate } from './evidenceTiers';
export const EVL_STAGES = ['qualification', 'investmentApproval', 'gateReview'] as const;
export const EVL_STAGE_LABEL: Record<string, string> = { qualification: 'Qualification', investmentApproval: 'Investment approval', gateReview: 'Gate review' };
const EXPECTED: Record<string, string> = { qualification: 'C', investmentApproval: 'B', gateReview: 'A' };
const GRADE_ORDER = ['D', 'C', 'B', 'A'];

export interface TornadoRow { id: string; swing: number }

/** The declared tier as the grade uses it: a MEASURED tier without a source, or (at a given evaluation date) older than ~18 months, is BENCHMARK (CC-EV-02). */
function declaredTier(c: Ctx, id: string, now: EvalDate): EvidenceTier {
  const e = evidenceOf(c.s.MODEL).drivers[id];
  if (!e) return 'ASSUMPTION';
  if (e.tier === 'MEASURED' && (!(e.source && e.source.trim()) || stale(e.asOf, now))) return 'BENCHMARK';
  return e.tier || 'ASSUMPTION';
}

/** The audited evidence of a driver (D-B33, `auditEvidence.ts`), or null when the case's audit holds none for it. */
export const auditedEvidence = (c: Ctx, id: string, now: EvalDate): AuditDriverEvidence | null =>
  auditEvidence(c.s.BPMN, now).find((a) => a.driver === id) ?? null;

/** The tier the grade uses: the stronger of the declared tier (after CC-EV-02) and the audited tier (D-B33). Without audit data: the declared one. */
export function effectiveTier(c: Ctx, id: string, now: EvalDate): EvidenceTier {
  const a = auditedEvidence(c, id, now), t = declaredTier(c, id, now);
  return a ? strongerTier(t, a.tier) : t;
}

/** Influence weights: the normalised P4 tornado swings; equal weights (flagged) until a run exists. */
function weights(tornado: TornadoRow[] | null) {
  const raw = MCS_DRIVER_ORDER.map((id) => tornado?.find((t) => t.id === id)?.swing ?? 0);
  const total = raw.reduce((s, v) => s + v, 0);
  return { weights: total > 0 ? raw.map((v) => v / total) : MCS_DRIVER_ORDER.map(() => 1 / MCS_DRIVER_ORDER.length), hasTornado: !!tornado };
}

/** Full P6 read-out (legacy evlModel()). `tornado` is the last stochastic run, if any; `now` the evaluation date (see `EvalDate`). */
export function evlModel(c: Ctx, tornado: TornadoRow[] | null, now: EvalDate) {
  const ev = evidenceOf(c.s.MODEL), w = weights(tornado);
  let num = 0, den = 0;
  const drivers = MCS_DRIVER_ORDER.map((id, i) => {
    const entry = ev.drivers[id], wt = w.weights[i] as number, eff = effectiveTier(c, id, now), audit = auditedEvidence(c, id, now);
    if (wt > 0) { num += wt * (EVIDENCE_TIERS[eff] || 0.25); den += wt; }
    return { id, label: mcsSpec(c, id).label || id, weight: wt, tier: (entry?.tier || 'ASSUMPTION') as EvidenceTier, effectiveTier: eff,
      source: entry?.source || '', asOf: entry?.asOf || '', owner: entry?.owner || '', audit };
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
