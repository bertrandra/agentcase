/** @calc-zone exports */
/**
 * The transformation programme process (docs/SPEC_BPMN.md § 19; phases B9a, B9b, B9e): stages, catalogue, lanes, timing owner, cost profile, derived view,
 * diagram, export.
 */
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
export { programmeLines, engineProfile, lineOnMonths, pilotLine, programmeRates, coachLoad, coachingPlan, convChangeCost, TRAIN_FTE, GOV_FTE,
  COACH_DAYS_PER_MONTH, type CoachingPlan, type ProgrammeLine,
  type ProgrammeLineId, type EngineProfile } from './profile';
export { OPT_INS, optInDef, optInOfKind, optInOn, optParam, optInPlan, type OptInId, type OptInDef } from './optIn';
export { COST_PROFILES, LINE_PROFILES, costProfileKey, costProfileLabel, lineOfKind, lineProfile, profiledMonths, activityType, type CostProfile,
  type CostProfileDef, type ActivityType } from './costProfile';
export { activityDescription, activityEnabled, descriptionKey, LINKED_SECTION, linkedSection, type ActivityEnabled } from './activityMeta';
export { programmeTable, byYear, type ProgrammeTable, type ProgrammeRow, type CostDetail } from './table';
