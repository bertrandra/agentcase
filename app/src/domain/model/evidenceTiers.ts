/** @calc-zone verdict */
import type { EvidenceTier } from './modelState';

/** The value of each evidence tier in the confidence score of the evidence ledger (P6). */
export const EVIDENCE_TIERS: Record<EvidenceTier, number> = { MEASURED: 1, BENCHMARK: 0.6, ASSUMPTION: 0.25 };
/** Tiers from the weakest to the strongest. */
const TIER_ORDER: readonly EvidenceTier[] = ['ASSUMPTION', 'BENCHMARK', 'MEASURED'];
const EIGHTEEN_MONTHS = 548 * 24 * 3600 * 1000;

/**
 * The evaluation date of the evidence ledger: ms since the epoch, chosen by the caller (the UI passes today; the domain never reads the clock), or null
 * for an undated evaluation (the age rule is not applied). The same file and the same date always give the same tiers and grade.
 */
export type EvalDate = number | null;

/** The evaluation date of a given day: its local midnight (what the screens pass for today, and the exports for their export day). */
export const evalDay = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** True when `asOf` (an ISO date) is older than ~18 months at `now` (CC-EV-02); never for an undated evaluation or an unreadable date. */
export function stale(asOf: string | undefined, now: EvalDate): boolean {
  if (!asOf || now === null) return false;
  const t = new Date(asOf).getTime();
  return !isNaN(t) && now - t > EIGHTEEN_MONTHS;
}

/** The stronger of two tiers. */
export const strongerTier = (a: EvidenceTier, b: EvidenceTier): EvidenceTier => (TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b);
/** The weaker of two tiers. */
export const weakerTier = (a: EvidenceTier, b: EvidenceTier): EvidenceTier => (TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b);
