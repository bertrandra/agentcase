/** @calc-zone delivery-views */
/**
 * The named deliverable of each work package of the programme WBS (docs/SPEC_BPMN.md § 19.8 F-B74, decision D-B35: phase / wave-oriented with
 * a named deliverable per work package, which keeps the ISO 21511 deliverable reading). Keyed by the activity kind of the programme catalogue
 * and of its milestones; a kind without an entry reads "The activity's outcome".
 */
const DELIVERABLES: Record<string, string> = {
  'stage-discover': 'AS-IS baseline and eligibility report', 'stage-calibrate': 'Frozen scope and sector coefficients',
  'stage-validate': 'Signed assumptions register and Monte Carlo run', 'stage-pilotProve': 'Pilot KPI report against the Y1 targets',
  'stage-decide': 'Scale decision (verdict)', pilot: 'Proven agentic factory (frozen harness and agents)',
  setupTooling: 'Agent platform, monitoring, security and CI/CD in place', setupTraining: 'Certified champions and trained teams',
  setupCoaching: 'Coached teams (pairing and review records)', setupGovernance: 'Agentic charter, compliance audit and IP rules',
  change: 'Readiness plan carried out', hubSetup: 'Knowledge Hub ingested, indexed and guarded', ktPrep: 'Knowledge-transfer pack of the product',
  build: 'Agents at steady state (adoption ramp completed)', run: 'Delivery by the agents, supervised', agentops: 'AgentOps run team staffed',
  hubRun: 'Curated Knowledge Hub', procurement: 'Signed licence contracts', integration: 'Agents connected to the delivery toolchain',
  hypercare: 'Stabilised go-live (incident and tuning log)', decommission: 'Retired legacy tools (licences ended, data archived)',
  valueTracking: 'Quarterly value-tracking reports', riskAiAct: 'Risk mitigations and AI Act obligations evidenced',
  auditInterviews: 'Audit interview records and observations', govGates: 'Governance gates in place',
  'gate-L2': 'Maturity L2 sign-off', 'gate-L3': 'Maturity L3 sign-off', 'gate-L4': 'Maturity L4 sign-off', capabilityTarget: 'Target capability reached',
};
export const deliverableOf = (kind: string): string => DELIVERABLES[kind] ?? 'The activity\'s outcome';
