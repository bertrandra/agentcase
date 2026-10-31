/** @calc-zone delivery-views */
import { EUR, optInParams, type ParamDef, type ProgrammeActivityDef, type ProgrammePhase } from './catalogueTypes';
import { OPT_IN_ACTIVITIES } from './catalogueOptIn';
import { ENGAGEMENT_STAGES } from './stages';

export { COST_RULE_TEXT, type CostRule, type ParamDef, type ProgrammeActivityDef, type ProgrammePhase, type TimingKind } from './catalogueTypes';

/**
 * The activities of the transformation programme (docs/SPEC_BPMN.md § 19.2 inventory, § 19.3 cost rules; phases B9a, B9b). This is where an
 * activity's description and parameters are held (§ 19.7): the programme process of the case is DERIVED from it and from today's keys (the values
 * stay in their keys until B9c), and no screen other than the Process section's parameter panel defines, describes or edits them. Their cost is the
 * programme's cost profile (`profile.ts`); the opt-in activities (D-B31) are off by default.
 */
export const PROGRAMME_PHASES: readonly { id: ProgrammePhase; name: string }[] = [
  { id: 'engagement', name: 'Engagement stages' }, { id: 'setup', name: 'Setup (per product)' }, { id: 'run', name: 'Build and run (per product)' },
  { id: 'assurance', name: 'Assurance and value' },
];
const CC = [0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: `CC${n}` }));
const RUN_MODES = [{ value: 'hybrid', label: 'Hybrid — floor + per-agent (default)' }, { value: 'legacy', label: 'Legacy — fixed on base-team size' }];
const months = (key: string, label: string): ParamDef => ({ key, label: `${label} (months; blank = the setup duration)`, unit: 'months', min: 0.5, step: 1 });
const fte = (key: string, label: string, def: number): ParamDef => ({ key, label: `${label} (FTE) — default ${def}`, unit: 'FTE', min: 0, step: 0.25 });

const stageParams = (id: string, input: string | null, name: string): ParamDef[] => {
  if (id === 'pilotProve') return [];
  const weeks: ParamDef[] = input ? [{ key: input, label: `${name} (weeks)`, unit: 'weeks', min: 0, step: 1 }] : [];
  return [...weeks, ...optInParams('stages', id === 'decide' ? ['decideDays'] : ['stagesFte'])];
};
const STAGES: ProgrammeActivityDef[] = ENGAGEMENT_STAGES.map((s) => ({
  kind: `stage-${s.id}`, name: s.name.replace(/^\d · /, ''), description: `${s.label}. Exit gate: ${s.gate}.`, phase: 'engagement',
  lane: s.id === 'pilotProve' ? 'orchestrator' : s.id === 'decide' ? 'designAuthority' : 'aiOffice',
  raci: { A: s.id === 'decide' ? 'aiOffice' : 'designAuthority', C: ['finops'], I: ['orchestrator'] }, level: 'case',
  costRule: s.id === 'pilotProve' ? 'none' : 'optIn', timing: s.timed ? 'stage' : 'gate', params: stageParams(s.id, s.input, s.name.replace(/^\d · /, '')),
  source: s.id === 'pilotProve' ? 'tune/program.ts pilotSizing (the pilot)' : 'frame/onboarding.ts, programme/optIn.ts',
}));
const TRAINING: ProgrammeActivityDef = {
  kind: 'setupTraining', name: 'Setup: training', description: 'Workshops, champion certification, run by the preceptors; it builds the capability of '
    + 'the organisation: the people in training are its trainees, up to the target mass.', phase: 'setup', lane: 'preceptor',
  raci: { A: 'aiOffice', C: [], I: ['orchestrator'] }, level: 'product', costRule: 'resources', timing: 'setup', source: 'programme/profile.ts',
  params: [fte('trainFte', 'Trainers', 0.5), months('trainMonths', 'Training duration'),
    { key: 'capOps', label: 'Operational now', unit: 'people', min: 0, step: 10 }, { key: 'capTrain', label: 'In training', unit: 'people', min: 0, step: 10 },
    { key: 'capTarget', label: 'Target mass', unit: 'people', min: 0, step: 10 }],
};
const CORE: ProgrammeActivityDef[] = [
  { kind: 'pilot', name: 'Pilot', description: 'A pilot pod proves the agentic factory (frozen harness + agents) by demonstration before the build: '
    + 'break-in sprints to stabilise the harness, then prove weeks on 3-day fail-fast iterations (the Pilot & Prove stage).', phase: 'setup',
  lane: 'orchestrator', raci: { A: 'designAuthority', C: ['preceptor'], I: ['finops'] }, level: 'product', costRule: 'resources', timing: 'pilot',
  source: 'tune/program.ts pilotSizing', params: [{ key: 'pilotFte', label: 'Pilot pod size (FTE)', unit: 'FTE', min: 1, max: 8, step: 1 },
    { key: 'pilotBreakin', label: 'Break-in sprints', unit: 'sprints', min: 0, max: 6, step: 1 },
    { key: 'pilotWeeks', label: 'Prove weeks', unit: 'weeks', min: 4, max: 26, step: 1 }] },
  { kind: 'setupTooling', name: 'Setup: tooling and infrastructure', description: 'Claude API, monitoring, security, CI/CD.', phase: 'setup',
    lane: 'agentArchitect', raci: { A: 'designAuthority', C: ['finops'], I: [] }, level: 'product', costRule: 'nonLabour', timing: 'setup',
    source: 'programme/profile.ts', params: [EUR('setupTooling', 'Setup tooling & infra (€)')] },
  TRAINING,
  { kind: 'setupCoaching', name: 'Setup: coaching', description: 'Pair programming, deliverable review, senior / junior binomes: the coaching load of '
    + 'the entry team weans from Y1 to cruise (one coaching activity, along its curve, D-B30).', phase: 'setup', lane: 'preceptor',
  raci: { A: 'aiOffice', C: ['orchestrator'], I: [] }, level: 'product', costRule: 'resources', timing: 'setup', source: 'programme/profile.ts coaching',
  params: [{ key: 'coachY1', label: 'Y1 coaching load (% capacity)', unit: '%', min: 0, max: 80, step: 5 },
    { key: 'coachCruise', label: 'Cruise coaching load (%)', unit: '%', min: 0, max: 60, step: 5 }] },
  { kind: 'setupGovernance', name: 'Setup: governance', description: 'Compliance audit, IP, agentic charter, run by the Design Authority.', phase: 'setup',
    lane: 'designAuthority', raci: { A: 'aiOffice', C: [], I: ['finops'] }, level: 'product', costRule: 'resources', timing: 'setup',
    source: 'programme/profile.ts', params: [fte('govFte', 'Design Authority effort', 0.25), months('govMonths', 'Governance duration')] },
  { kind: 'change', name: 'Change management (readiness)', description: 'Entry headcount × cost per FTE of the human-readiness intensity (HRI).',
    phase: 'setup', lane: 'aiOffice', raci: { A: 'aiOffice', C: ['preceptor'], I: [] }, level: 'product', costRule: 'engine', timing: 'setup',
    source: 'programme/profile.ts convChangeCost', params: [], module: 'hriEnabled' },
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
];
export const PROGRAMME_ACTIVITIES: readonly ProgrammeActivityDef[] = [...STAGES, ...CORE, ...OPT_IN_ACTIVITIES];
export const activityDef = (kind: string): ProgrammeActivityDef | undefined => PROGRAMME_ACTIVITIES.find((a) => a.kind === kind);
