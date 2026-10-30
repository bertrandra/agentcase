/** @calc-zone verdict */
import { activityAudits } from '../audit/analysis';
import { hasAudit, readAudit } from '../audit/read';
import type { Observation } from '../audit/types';
import type { XDocument } from '../process/xml';
import { EVIDENCE_TIERS, stale, strongerTier, weakerTier, type EvalDate } from './evidenceTiers';
import { MCS_DRIVER_SEED } from './mcsDrivers';
import type { EvidenceTier } from './modelState';

/**
 * Audited observations as evidence in the evidence ledger of the Defend group (docs/SPEC_BPMN.md § 15.7, D-B33). The ONE owner of the mapping
 * driver ← audit field: the ledger, the audit report and the results workbook read `auditEvidence`, never the observations.
 *
 * - `p` (acceptance rate, P1) ← `firstPassYield`, `reworkRate`: the share of the work accepted without rework.
 * - `supCapacity` (supervising capacity, P3) ← `fteShare`: the share of each role's time the activity really takes.
 * - The ramps (forecasts), the loaded day rate and the token price (no cost field in § 15.3) have no audit field: never audited.
 *
 * Tier of one observation (§ 15.3 provenance): confidence high → MEASURED, medium → BENCHMARK, low or none → ASSUMPTION; without a source or a
 * date → ASSUMPTION; source "estimate", or a date older than ~18 months at the evaluation date (CC-EV-02) → at most BENCHMARK.
 * Tier of an activity: the strongest of its supporting observations (per-role values included). Score of a driver: Σ effort × tier value / Σ effort
 * over the in-scope activities, an activity without a supporting observation counting as ASSUMPTION (0.25); audited tier: MEASURED at score 1
 * (every in-scope activity measured), BENCHMARK from 0.6, else ASSUMPTION. Only drivers with one supporting observation at least are listed.
 */
export const AUDIT_DRIVER_FIELDS: Readonly<Record<string, readonly string[]>> = {
  p: ['firstPassYield', 'reworkRate'],
  supCapacity: ['fteShare'],
};

export interface AuditDriverEvidence {
  driver: string; label: string; fields: readonly string[]; tier: EvidenceTier;
  /** Σ effort × tier value / Σ effort over the in-scope activities, in [0.25, 1] */
  score: number;
  /** in-scope activities with a supporting observation, of `inScope`; supporting observations */
  activities: number; inScope: number; observations: number;
}

const CONFIDENCE_TIER: Record<string, EvidenceTier> = { high: 'MEASURED', medium: 'BENCHMARK' };
const EPS = 1e-9;

/** The evidence tier of one observation (provenance of § 15.3). */
export function observationTier(o: Observation, now: EvalDate): EvidenceTier {
  if (!o.source || !o.date) return 'ASSUMPTION';
  const t = CONFIDENCE_TIER[o.confidence ?? ''] ?? 'ASSUMPTION';
  return o.source === 'estimate' || stale(o.date, now) ? weakerTier(t, 'BENCHMARK') : t;
}

const tierOfScore = (s: number): EvidenceTier =>
  (s >= EVIDENCE_TIERS.MEASURED - EPS ? 'MEASURED' : s >= EVIDENCE_TIERS.BENCHMARK - EPS ? 'BENCHMARK' : 'ASSUMPTION');

function compute(d: XDocument, now: EvalDate): AuditDriverEvidence[] {
  if (!hasAudit(d)) return [];
  const els = readAudit(d).elements, rows = activityAudits(d).filter((r) => r.inScope), total = rows.reduce((t, r) => t + r.effort, 0);
  if (!(total > 0)) return [];
  return Object.entries(AUDIT_DRIVER_FIELDS).flatMap(([driver, fields]): AuditDriverEvidence[] => {
    let sum = 0, activities = 0, observations = 0;
    for (const r of rows) {
      const os = (els.get(r.id)?.observations ?? []).filter((o) => fields.includes(o.name));
      const tier = os.reduce<EvidenceTier>((t, o) => strongerTier(t, observationTier(o, now)), 'ASSUMPTION');
      sum += r.effort * EVIDENCE_TIERS[tier];
      if (os.length) { activities++; observations += os.length; }
    }
    if (!observations) return [];
    const score = sum / total;
    return [{ driver, label: MCS_DRIVER_SEED[driver]?.label ?? driver, fields, tier: tierOfScore(score), score, activities, inScope: rows.length,
      observations }];
  });
}

const memo = new WeakMap<XDocument, Map<EvalDate, AuditDriverEvidence[]>>();
/** The audited evidence of each mapped driver of a document at an evaluation date (memoised); empty without audit data. */
export function auditEvidence(d: XDocument | undefined, now: EvalDate): AuditDriverEvidence[] {
  if (!d) return [];
  const m = memo.get(d) ?? new Map<EvalDate, AuditDriverEvidence[]>(), hit = m.get(now);
  if (hit) return hit;
  const out = compute(d, now);
  m.set(now, out); memo.set(d, m);
  return out;
}

/** The columns of the audited evidence on the exports (audit report section 6, results workbook Audit sheet). */
export const EVIDENCE_LEDGER_HEADERS = ['Driver', 'Audit fields', 'Audited tier', 'Score', 'Activities supporting', 'Observations'] as const;
/** The score as every surface prints it (3 decimals). */
export const evidenceScore = (a: AuditDriverEvidence): number => Math.round(a.score * 1000) / 1000;
/** One row per audited driver, in `EVIDENCE_LEDGER_HEADERS` order: what the report and the workbook print, never recomputed. */
export const evidenceRows = (xs: readonly AuditDriverEvidence[]): (string | number)[][] =>
  xs.map((a) => [a.label, a.fields.join(', '), a.tier, evidenceScore(a), `${a.activities}/${a.inScope}`, a.observations]);
