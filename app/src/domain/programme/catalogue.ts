/** @calc-zone delivery-views */
import type { LaneRole } from './lanes';
import { ENGAGEMENT_STAGES } from './stages';

/**
 * The activities of the transformation programme (docs/SPEC_BPMN.md § 19.2 inventory, § 19.3 cost rules; phase B9a). This is where an activity's
 * description and parameters are held (§ 19.7): the programme process of the case is DERIVED from it and from today's keys (like the B6b teams;
 * the values stay in their keys until B9c), and no screen other than the Process section's parameter panel defines, describes or edits them.
 */
export type ProgrammePhase = 'engagement' | 'setup' | 'run' | 'assurance';
export const PROGRAMME_PHASES: readonly { id: ProgrammePhase; name: string }[] = [
  { id: 'engagement', name: 'Engagement stages' }, { id: 'setup', name: 'Setup (per product)' }, { id: 'run', name: 'Build and run (per product)' },
  { id: 'assurance', name: 'Assurance and value' },
];
/** § 19.3: labour from resources, a non-labour cost item, an engine figure displayed, no cost of its own, or a new cost (opt-in, B9b). */
export type CostRule = 'resources' | 'nonLabour' | 'engine' | 'sameAsHubSetup' | 'optIn' | 'none';
export const COST_RULE_TEXT: Record<CostRule, string> = {
  resources: 'Labour: effort × role rate (today\'s formula kept)', nonLabour: 'Non-labour cost item (an amount)',
  engine: 'Engine result, displayed (never recomputed)', sameAsHubSetup: 'The hub setup amount, placed earlier (never added)',
  optIn: 'New cost, off by default (opt-in from B9b)', none: 'No cost of its own (a gate)',
};
/** Where the timing owner places the activity (`timing.ts`). */
export type TimingKind = 'stage' | 'gate' | 'pilot' | 'setup' | 'hubSetup' | 'ktPrep' | 'build' | 'run' | 'hubRun' | 'case';
export interface ParamDef {
  key: string; label: string; unit: string; min?: number; max?: number; step?: number;
  /** `values`: a case input; `knowledge`: the product's knowledge subset (portfolio) */
  store?: 'values' | 'knowledge';
  options?: readonly { value: string; label: string }[];
  /** shown only with one product (a portfolio edits it on the shared hub card) */
  singleOnly?: boolean;
}
export interface ProgrammeActivityDef {
  kind: string; name: string; description: string; phase: ProgrammePhase; lane: LaneRole;
  raci: { A?: LaneRole; C: LaneRole[]; I: LaneRole[] };
  level: 'case' | 'product'; costRule: CostRule; timing: TimingKind; params: ParamDef[];
  /** the module that sizes or prices it today */
  source: string;
  /** the case switch it depends on (the activity is in the process only when the module is on) */
  module?: 'khEnabled' | 'hriEnabled';
}

const EUR = (key: string, label: string, step = 5000): ParamDef => ({ key, label, unit: '€', min: 0, step });
const CC = [0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: `CC${n}` }));
const RUN_MODES = [{ value: 'hybrid', label: 'Hybrid — floor + per-agent (default)' }, { value: 'legacy', label: 'Legacy — fixed on base-team size' }];

const STAGES: ProgrammeActivityDef[] = ENGAGEMENT_STAGES.map((s) => ({
  kind: `stage-${s.id}`, name: s.name.replace(/^\d · /, ''), description: `${s.label}. Exit gate: ${s.gate}.`, phase: 'engagement',
  lane: s.id === 'pilotProve' ? 'orchestrator' : s.id === 'decide' ? 'designAuthority' : 'aiOffice',
  raci: { A: s.id === 'decide' ? 'aiOffice' : 'designAuthority', C: ['finops'], I: ['orchestrator'] }, level: 'case', costRule: s.input ? 'optIn' : 'none',
  timing: s.input ? 'stage' : 'gate',
  params: s.input ? [{ key: s.input, label: `${s.name.replace(/^\d · /, '')} (weeks)`, unit: 'weeks', min: 0, step: 1 }] : [],
  source: 'frame/onboarding.ts, verifyB/ganttProgram.ts',
}));

export const PROGRAMME_ACTIVITIES: readonly ProgrammeActivityDef[] = [
  ...STAGES,
  { kind: 'pilot', name: 'Pilot', description: 'A pilot pod proves the agentic factory (frozen harness + agents) by demonstration: break-in sprints to '
    + 'stabilise the harness, then prove weeks on 3-day fail-fast iterations.', phase: 'setup', lane: 'orchestrator',
  raci: { A: 'designAuthority', C: ['preceptor'], I: ['finops'] }, level: 'product', costRule: 'resources', timing: 'pilot',
  source: 'tune/program.ts pilotSizing',
  params: [{ key: 'pilotFte', label: 'Pilot pod size (FTE)', unit: 'FTE', min: 1, max: 8, step: 1 },
    { key: 'pilotBreakin', label: 'Break-in sprints', unit: 'sprints', min: 0, max: 6, step: 1 },
    { key: 'pilotWeeks', label: 'Prove weeks', unit: 'weeks', min: 4, max: 26, step: 1 }] },
  { kind: 'setupTooling', name: 'Setup: tooling and infrastructure', description: 'Claude API, monitoring, security, CI/CD.', phase: 'setup',
    lane: 'agentArchitect', raci: { A: 'designAuthority', C: ['finops'], I: [] }, level: 'product', costRule: 'nonLabour', timing: 'setup',
    source: 'tuneB/setup.ts setupBreakdown', params: [EUR('setupTooling', 'Setup tooling & infra (€)')] },
  { kind: 'setupTraining', name: 'Setup: training', description: 'Workshops, champion certification; it builds the capability of the organisation: '
    + 'the people in training are its trainees, up to the target mass.', phase: 'setup', lane: 'preceptor',
  raci: { A: 'aiOffice', C: [], I: ['orchestrator'] }, level: 'product', costRule: 'resources', timing: 'setup',
  source: 'tuneB/setup.ts setupBreakdown, tune/program.ts capability', params: [EUR('setupTraining', 'Setup training & change (€)'),
    { key: 'capOps', label: 'Operational now', unit: 'people', min: 0, step: 10 }, { key: 'capTrain', label: 'In training', unit: 'people', min: 0, step: 10 },
    { key: 'capTarget', label: 'Target mass', unit: 'people', min: 0, step: 10 }] },
  { kind: 'setupCoaching', name: 'Setup: coaching', description: 'Pair programming, deliverable review; the coaching load weans from Y1 to cruise.',
    phase: 'setup', lane: 'preceptor', raci: { A: 'aiOffice', C: ['orchestrator'], I: [] }, level: 'product', costRule: 'resources', timing: 'setup',
    source: 'tuneB/setup.ts setupBreakdown, tune/maturityTab.ts coachView', params: [EUR('setupCoaching', 'Setup coaching (€)'),
      { key: 'coachY1', label: 'Y1 coaching load (% capacity)', unit: '%', min: 0, max: 80, step: 5 },
      { key: 'coachCruise', label: 'Cruise coaching load (%)', unit: '%', min: 0, max: 60, step: 5 }] },
  { kind: 'setupGovernance', name: 'Setup: governance', description: 'Compliance audit, IP, agentic charter.', phase: 'setup', lane: 'designAuthority',
    raci: { A: 'aiOffice', C: [], I: ['finops'] }, level: 'product', costRule: 'resources', timing: 'setup', source: 'tuneB/setup.ts setupBreakdown',
    params: [EUR('setupGov', 'Setup governance (€)')] },
  { kind: 'change', name: 'Change management (readiness)', description: 'Entry headcount × cost per FTE of the human-readiness intensity (HRI).',
    phase: 'setup', lane: 'aiOffice', raci: { A: 'aiOffice', C: ['preceptor'], I: [] }, level: 'product', costRule: 'engine', timing: 'setup',
    source: 'tuneB/setup.ts convChangeCost', params: [], module: 'hriEnabled' },
  { kind: 'hubSetup', name: 'Knowledge Hub setup', description: 'Ingest, index and guardrails: the hub setup base × the context-completeness gap to close.',
    phase: 'setup', lane: 'agentArchitect', raci: { A: 'designAuthority', C: ['aiReviewer'], I: [] }, level: 'product', costRule: 'resources',
    timing: 'hubSetup', source: 'knowledge.ts khSetupCost', module: 'khEnabled', params: [
      { key: 'khTargetCC', label: 'Target CC (Y3)', unit: 'level', options: CC }, EUR('khSetupBase', 'Hub setup base (€)', 10000),
      { key: 'khSetupDays', label: 'Setup duration (days)', unit: 'days', min: 1, step: 5 }] },
  { kind: 'ktPrep', name: 'Knowledge transfer preparation', description: 'The product\'s knowledge transfer prepared before its wave starts.',
    phase: 'setup', lane: 'preceptor', raci: { A: 'aiOffice', C: ['aiReviewer'], I: [] }, level: 'product', costRule: 'sameAsHubSetup',
    timing: 'ktPrep', source: 'portfolio/knowledge.ts', module: 'khEnabled',
    params: [{ key: 'ktLeadMonths', label: 'Preparation (months before the wave)', unit: 'months', min: 0, step: 1, store: 'knowledge' }] },
  { kind: 'build', name: 'Agentic build and adoption ramp', description: 'Ramp to steady state along the S-curve, milestones L1…L4.', phase: 'run',
    lane: 'orchestrator', raci: { A: 'designAuthority', C: ['agentArchitect'], I: ['finops'] }, level: 'product', costRule: 'engine', timing: 'build',
    source: 'time/engine.ts', params: [{ key: 'setupDuration', label: 'Setup duration (months)', unit: 'months', min: 1, step: 1 }] },
  { kind: 'run', name: 'Agentic run (steady state)', description: 'The agents deliver and support, supervised by the delivery team.', phase: 'run',
    lane: 'agents', raci: { A: 'orchestrator', C: [], I: ['finops'] }, level: 'product', costRule: 'engine', timing: 'run', source: 'time/kernel.ts econ',
    params: [] },
  { kind: 'agentops', name: 'AgentOps run team', description: 'Platform floor plus an operations load per agent vFTE.', phase: 'run',
    lane: 'orchestrator', raci: { A: 'designAuthority', C: ['agentArchitect'], I: ['finops'] }, level: 'product', costRule: 'engine', timing: 'run',
    source: 'time/kernel.ts runTeamSizing', params: [{ key: 'runSizeMode', label: 'Mode', unit: '', options: RUN_MODES },
      { key: 'runFloorMin', label: 'Platform floor min (FTE)', unit: 'FTE', min: 0, step: 0.1 },
      { key: 'runFloorPct', label: 'Platform floor (% of base team)', unit: '%', min: 0, step: 0.5 },
      { key: 'runOpsPerAgent', label: 'Ops load per agent vFTE', unit: 'FTE', min: 0, step: 0.01 }] },
  { kind: 'hubRun', name: 'Knowledge Hub run', description: 'Curation and retrieval; the infrastructure is shared by the products.', phase: 'run',
    lane: 'aiReviewer', raci: { A: 'designAuthority', C: [], I: ['finops'] }, level: 'product', costRule: 'resources', timing: 'hubRun',
    source: 'knowledge.ts khRunAnnual', module: 'khEnabled',
    params: [{ key: 'khCurationFTE', label: 'Curation (FTE)', unit: 'FTE', min: 0, max: 2, step: 0.25 },
      { key: 'khInfraMonthly', label: 'Hub infra (€/mo)', unit: '€/month', min: 0, step: 250, singleOnly: true }] },
  { kind: 'valueTracking', name: 'Value tracking', description: 'Actuals per quarter against the plan; steer when behind.', phase: 'assurance',
    lane: 'finops', raci: { A: 'aiOffice', C: [], I: ['designAuthority'] }, level: 'case', costRule: 'optIn', timing: 'case', source: 'frame/onboarding.ts',
    params: [] },
  { kind: 'riskAiAct', name: 'Risk mitigations and AI Act obligations', description: 'The mitigations of the risk register and the obligations of '
    + 'the AI Act tier.', phase: 'assurance', lane: 'aiOffice', raci: { A: 'aiOffice', C: ['designAuthority'], I: [] }, level: 'case', costRule: 'optIn',
  timing: 'case', source: 'RISK_REGISTER, AIACT_TIERS', params: [] },
  { kind: 'auditInterviews', name: 'Audit and discovery interviews', description: 'Interviews and observations of the audit layer (§ 15).',
    phase: 'assurance', lane: 'aiReviewer', raci: { A: 'designAuthority', C: [], I: [] }, level: 'case', costRule: 'optIn', timing: 'case',
    source: 'domain/audit', params: [] },
];
export const activityDef = (kind: string): ProgrammeActivityDef | undefined => PROGRAMME_ACTIVITIES.find((a) => a.kind === kind);
