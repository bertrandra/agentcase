/** @calc-zone delivery-views */
import { optInParams, type ProgrammeActivityDef } from './catalogueTypes';

/**
 * The opt-in activities of the programme catalogue (docs/SPEC_BPMN.md § 19.2; D-B31, phase B9b): value tracking, AI Act obligations, audit
 * interviews and the four agent-rollout activities. Each is a programme task with its lane, RACI, duration, placement and parameters, OFF by default
 * (`optIn.ts` prices and places it when switched on). The engagement stages' opt-in cost sits on the stage activities (`catalogue.ts`).
 */
export const OPT_IN_ACTIVITIES: readonly ProgrammeActivityDef[] = [
  { kind: 'procurement', name: 'Licence procurement', description: 'Selecting and buying the agent platform, model and tool licences: sourcing, '
    + 'security and legal review, contract. The licence amounts stay the tooling and token cost lines, never added twice.', phase: 'setup',
  lane: 'finops', raci: { A: 'aiOffice', C: ['designAuthority', 'agentArchitect'], I: [] }, level: 'case', costRule: 'optIn', timing: 'optIn',
  source: 'programme/optIn.ts', params: optInParams('procurement') },
  { kind: 'integration', name: 'Agent-toolchain integration', description: 'Connecting the agents to the delivery toolchain: repository, CI/CD, '
    + 'ticketing, wiki, test management and the Knowledge Hub (API, MCP or CLI per the tool catalogue; the "agent blocked: no API" check lists the '
    + 'gaps).', phase: 'setup', lane: 'agentArchitect', raci: { A: 'designAuthority', C: ['orchestrator'], I: ['finops'] }, level: 'product',
  costRule: 'optIn', timing: 'optIn', source: 'programme/optIn.ts', params: optInParams('integration') },
  { kind: 'hypercare', name: 'Rollout hypercare', description: 'Intensified support right after the product\'s agent go-live (the adoption ramp '
    + 'start): incident triage, prompt and guardrail tuning, user support; it ends before the steady AgentOps run takes over.', phase: 'run',
  lane: 'orchestrator', raci: { A: 'designAuthority', C: ['aiReviewer'], I: ['finops'] }, level: 'product', costRule: 'optIn', timing: 'optIn',
  source: 'programme/optIn.ts', params: optInParams('hypercare') },
  { kind: 'decommission', name: 'Legacy decommissioning', description: 'Retiring the tools, scripts and manual steps the agents replace: licences '
    + 'ended, data archived, access removed. A saving (licences ended) counts only when entered, never inferred.', phase: 'run', lane: 'agentArchitect',
  raci: { A: 'designAuthority', C: ['finops'], I: ['aiOffice'] }, level: 'product', costRule: 'optIn', timing: 'optIn', source: 'programme/optIn.ts',
  params: optInParams('decommission') },
  { kind: 'valueTracking', name: 'Value tracking', description: 'Actuals per quarter against the plan; steer when behind.', phase: 'assurance',
    lane: 'finops', raci: { A: 'aiOffice', C: [], I: ['designAuthority'] }, level: 'case', costRule: 'optIn', timing: 'optIn',
    source: 'frame/onboarding.ts, programme/optIn.ts', params: optInParams('valueTracking') },
  { kind: 'riskAiAct', name: 'Risk mitigations and AI Act obligations', description: 'The mitigations of the risk register and the obligations of '
    + 'the AI Act tier.', phase: 'assurance', lane: 'aiOffice', raci: { A: 'aiOffice', C: ['designAuthority'], I: [] }, level: 'case', costRule: 'optIn',
  timing: 'optIn', source: 'RISK_REGISTER, AIACT_TIERS, programme/optIn.ts', params: optInParams('aiAct') },
  { kind: 'auditInterviews', name: 'Audit and discovery interviews', description: 'Interviews and observations of the audit layer (§ 15).',
    phase: 'assurance', lane: 'aiReviewer', raci: { A: 'designAuthority', C: [], I: [] }, level: 'case', costRule: 'optIn', timing: 'optIn',
    source: 'domain/audit, programme/optIn.ts', params: optInParams('audit') },
];
