/** @calc-zone process-model */
import type { Ctx } from '../ctx';
import { cadenceOf, changeFailureRate, handoffsOf, waitsOf } from './profile';

/**
 * The process model feeding the engine, opt-in per factor (SPEC_FIXES FX-D8 (a); decision 2026-11-02, the owner's "go to the end" on the proposed
 * defaults). Each factor is a tick box of the case (`dom.checked`), off by default: off, nothing reads the model and every figure is today's.
 * - `feedCfr`: the change-failure rate of the compensation handlers (`changeFailureRate`) is the DORA change-failure rate (Model Engine) and the
 *   failed-deployment rate of the generated factory data.
 * - `feedCadence`: the delivery cadence (a cycle timer on a start event, `cadenceOf`) sets the weeks between releases of the factory data and the
 *   releases a year the hand-off cost is counted on.
 * - `feedHandoff`: the coordination hours of the hand-offs (message flows, send / receive tasks, `handoffsOf`) are a run cost: hours a release ×
 *   releases a year × the target day rate / 8, spread evenly over the months, from the first month with agents.
 * - `feedWaits`: the waiting days of each phase (timer catch events, `waitsOf`) lengthen that phase on the delivery Gantt (timing only, no cost).
 * The token profile (code / prose) is not here: it is SPEC_HARNESS § 11's token owner.
 */
export const FEED_KEYS = { cfr: 'feedCfr', cadence: 'feedCadence', handoff: 'feedHandoff', waits: 'feedWaits' } as const;
export type FeedId = keyof typeof FEED_KEYS;
export const FEED_LABELS: Record<FeedId, string> = {
  cfr: 'Change-failure rate from the compensation handlers (DORA row, failed deployments of the factory data)',
  cadence: 'Delivery cadence from the start event\'s cycle timer (weeks between releases)',
  handoff: 'Hand-off coordination hours as a run cost (hours a release × releases a year × day rate / 8)',
  waits: 'Waiting days of the timer events lengthen their phase on the delivery Gantt (timing only)',
};
/** Weeks between releases when the cadence does not say (the factory data's default). */
export const DEFAULT_RELEASE_WEEKS = 8;

export interface ProcessFeeds {
  /** change-failure rate, 0..1 */
  cfr?: number;
  /** weeks between releases */
  cadenceWeeks?: number;
  /** coordination hours a release */
  handoffHours?: number;
  /** waiting days per phase */
  waits?: ReadonlyMap<string, number>;
}

const memo = new WeakMap<object, ProcessFeeds>();
/** What the ticked factors read from the case's process (a factor the model does not give is left out, so its coefficient stays). */
export function processFeeds(c: Ctx): ProcessFeeds {
  const on = (id: FeedId): boolean => c.inp.c(FEED_KEYS[id]);
  if (!on('cfr') && !on('cadence') && !on('handoff') && !on('waits')) return {};
  const root = c.s.BPMN?.root;
  if (!root) return {};
  const key = `${+on('cfr')}${+on('cadence')}${+on('handoff')}${+on('waits')}`, hit = memo.get(root) as (ProcessFeeds & { k?: string }) | undefined;
  if (hit && hit.k === key) return hit;
  const out: ProcessFeeds & { k?: string } = { k: key };
  if (on('cfr')) { const r = changeFailureRate(root); if (r !== undefined) out.cfr = Math.max(0, Math.min(1, r)); }
  if (on('cadence')) { const k = cadenceOf(root); if (k && k.days > 0) out.cadenceWeeks = k.days / 7; }
  if (on('handoff')) { const h = handoffsOf(root).hours; if (h > 0) out.handoffHours = h; }
  if (on('waits')) { const w = waitsOf(root); if (w.size) out.waits = w; }
  memo.set(root, out);
  return out;
}

/** Releases a year: from the cadence when it feeds the engine, else the factory data's default. */
export const releasesPerYear = (f: ProcessFeeds): number => 52 / (f.cadenceWeeks ?? DEFAULT_RELEASE_WEEKS);
/** The monthly run cost of the hand-offs (0 when the factor is off or the model has none). `dayRate`: the target blended day rate. */
export const handoffMonthCost = (f: ProcessFeeds, dayRate: number): number =>
  f.handoffHours ? (f.handoffHours * releasesPerYear(f) * dayRate) / 8 / 12 : 0;
