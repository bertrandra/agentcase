/** @calc-zone run-setup-taxes */
import type { ColourRole } from '../theme';

/**
 * The engagement stages of the transformation programme (docs/SPEC_BPMN.md § 19.2, conflict T4; phase B9a): the ONE list that the Engage roadmap,
 * the runway band, the Gantt programme band, the Board variables and the programme process read. Before B9a the five stages were written in
 * `frame/onboarding.ts` and four of them again in `verifyB/ganttProgram.ts`; each surface now reads this list and prints what it printed before.
 * The stage's description lives here (the programme process's activity), never on a screen.
 */
export type StageId = 'discover' | 'calibrate' | 'validate' | 'pilotProve' | 'decide';
export interface EngagementStage {
  id: StageId;
  /** the roadmap name ("0 · Discover") and the Gantt name ("🔍 Discover") */
  name: string; gantt: string; tone: ColourRole;
  /** what happens in the stage (the activity's description) and its exit gate */
  label: string; gate: string;
  /** the section the stage's work happens in */
  section: string;
  /** the input holding its duration in weeks (null: the last stage, a gate with no duration) and the default the engagement view reads */
  input: string | null; defaultWeeks: number;
}

export const ENGAGEMENT_STAGES: readonly EngagementStage[] = [
  { id: 'discover', name: '0 · Discover', gantt: '🔍 Discover', tone: 'chart-cat-5', label: 'Framing, AS-IS baseline, eligibility',
    gate: 'Baseline validated + eligibility', section: 'engagement-context', input: 'rmD1', defaultWeeks: 4 },
  { id: 'calibrate', name: '1 · Calibrate', gantt: '🎯 Calibrate', tone: 'chart-cat-5', label: 'Sector coefficients, artifact scope frozen',
    gate: 'Scope & coefficients frozen', section: 'scope-sel', input: 'rmD2', defaultWeeks: 4 },
  { id: 'validate', name: '2 · Validate', gantt: '✅ Validate', tone: 'chart-cat-5', label: 'Assumptions signed, Monte Carlo run',
    gate: 'Assumptions register signed · P50 > threshold', section: 'montecarlo', input: 'rmD3', defaultWeeks: 4 },
  { id: 'pilotProve', name: '3 · Pilot & Prove', gantt: '🚀 Pilot & Prove', tone: 'chart-cat-3', label: 'Pilot pods, KPI tracking',
    gate: 'Pilot KPIs ≥ 80% of Y1 targets', section: 'kpi', input: 'rmD4', defaultWeeks: 6 },
  { id: 'decide', name: '4 · Decide & Scale', gantt: '🏁 Decide & Scale', tone: 'chart-cat-3', label: 'Scale-out per Decision Intelligence',
    gate: 'Verdict ≥ Conditional GO', section: 'decision', input: null, defaultWeeks: 0 },
];

/** The four timed stages (Discover … Pilot & Prove), in order. */
export const TIMED_STAGES: readonly EngagementStage[] = ENGAGEMENT_STAGES.filter((s) => s.input !== null);
/** The stage defaults in weeks (4, 4, 4, 6), legacy `STAGE_DEFAULTS`. */
export const STAGE_DEFAULTS: readonly number[] = TIMED_STAGES.map((s) => s.defaultWeeks);
