/** @calc-zone delivery-views */
/**
 * The swim lanes of the transformation programme (docs/SPEC_BPMN.md § 19.4 F-B64; phase B9a): one lane per operating-model role of
 * `tune/opmodel.ts` (EV-09: orchestrator, AI reviewer, preceptor, agent architect, FinOps, Design Authority, AI Office lead) and a lane of their own
 * for the AI agents. `topology` names the field of the EV-09 topology that gives the role's FTE (Y1), shown on the lane; the lanes sit in the
 * organisation's delivery unit (§ 16, `domain/org`).
 */
export type LaneRole = 'aiOffice' | 'designAuthority' | 'orchestrator' | 'aiReviewer' | 'preceptor' | 'agentArchitect' | 'finops' | 'agents';
export type TopologyField = 'lead' | 'da' | 'orch' | 'rev' | 'prec' | 'arch' | 'finops';
export interface ProgrammeLaneDef { role: LaneRole; name: string; topology: TopologyField | null; description: string }

export const PROGRAMME_LANES: readonly ProgrammeLaneDef[] = [
  { role: 'aiOffice', name: 'AI Office lead', topology: 'lead',
    description: 'Sponsors the programme: engagement stages, change management, risk and AI Act obligations.' },
  { role: 'designAuthority', name: 'Design Authority', topology: 'da', description: 'Owns the gates, the governance setup and the decision to scale.' },
  { role: 'orchestrator', name: 'Orchestrator', topology: 'orch', description: 'Runs the pods: pilot, build ramp and the AgentOps run team.' },
  { role: 'aiReviewer', name: 'AI reviewer', topology: 'rev', description: 'Reviews agent output; curates the Knowledge Hub.' },
  { role: 'preceptor', name: 'Preceptor', topology: 'prec', description: 'Trains and coaches the teams; prepares the knowledge transfer.' },
  { role: 'agentArchitect', name: 'Agent architect', topology: 'arch', description: 'Sets up the tooling, the platform and the Knowledge Hub.' },
  { role: 'finops', name: 'FinOps', topology: 'finops', description: 'Tracks the value and the run cost against the plan.' },
  { role: 'agents', name: 'AI agents', topology: null, description: 'The agents themselves, once enabled: they perform the delivery work.' },
];
export const laneDef = (role: LaneRole): ProgrammeLaneDef => PROGRAMME_LANES.find((l) => l.role === role) as ProgrammeLaneDef;
