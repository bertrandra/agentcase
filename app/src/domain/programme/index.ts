/** @calc-zone exports */
/** The transformation programme process (docs/SPEC_BPMN.md § 19; phase B9a): stages, catalogue, lanes, timing owner, derived view, diagram, export. */
export * from './stages';
export * from './timing';
export * from './ids';
export { PROGRAMME_LANES, laneDef, type LaneRole, type ProgrammeLaneDef } from './lanes';
export { PROGRAMME_ACTIVITIES, PROGRAMME_PHASES, COST_RULE_TEXT, activityDef, type ParamDef, type ProgrammeActivityDef, type CostRule, type ProgrammePhase,
  type TimingKind } from './catalogue';
export { programmeProcess, type ProgrammeView, type ProgrammeActivity, type ProgrammeLane, type ProgrammeWave, type ProgrammeMessageFlow,
  type ParamValue } from './model';
export { programmeDrawing } from './layout';
export type { Placement } from './placement';
export type { ActivityCost } from './costs';
export { MILESTONE_NAMES, programmeMilestones, type ProgrammeMilestone } from './milestones';
