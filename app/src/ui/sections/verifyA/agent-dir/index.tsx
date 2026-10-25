import { agentDirectory, agentName, loopRows, REG_PHASES, rolesForPhase } from '@/domain/verifyA';
import { useDoc } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { CheckInput, SelectInput } from '@/ui/widgets/fields';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SimpleTable } from '../SimpleTable';
import { useLive } from '../useLive';

const help = (
  <>
    <p>Execution agents and operational roles active per lifecycle phase, derived from the artefact catalogue, plus the three agentic loop pairs that connect
      artefacts across phases.</p>
    <p>Both loop toggles are off by default and never move the golden case: the internal loop only adds an informational token-cost estimate, the external
      rework majors the destination phase's effort (verification-tax mechanism).</p>
  </>
);
const OPTIONS = [{ value: 'ALL', label: 'All phases' }, ...REG_PHASES.map((p) => ({ value: p, label: p }))];

/** Agent directory — execution agents by authorization level, operational roles of the phase and the agentic loop pairs. */
export default function AgentDirSection() {
  const live = useLive(), sel = useDoc((d) => d.dom.values['agentDirPhaseSel'] ?? 'ALL'), phase = REG_PHASES.includes(sel) ? sel : 'ALL';
  const agents = agentDirectory(live.c, phase), roles = rolesForPhase(live.c, phase), loops = loopRows(live.c);
  return (
    <SectionFrame title="🧑‍💻 Agent Directory" help={help}
      input={<SelectInput id="agentDirPhaseSel" label="Phase" options={OPTIONS} />}
      result={<>
        <Panel title="Execution agents by authorization level">
          <SimpleTable align={['left', 'left', 'left', 'left', 'center', 'center', 'left']} empty="No agent active for this phase"
            head={['Agent code', 'Agent', 'Auth. level', 'Skill', 'Capacity (runs/day)', 'Avg. agentSup', 'Artefacts produced']}
            rows={agents.map((a) => ({ key: a.agent.id, cells: [a.agent.id, <b>{agentName(a.agent)}</b>, a.agent.aiAuth, a.agent.skill, a.agent.capacity,
              a.avgSup == null ? '—' : `${a.avgSup}%`, a.produced] }))} />
        </Panel>
        <Panel title="Operational roles relevant to this phase">
          <SimpleTable head={['Operational role']} empty="No role active for this phase" rows={roles.map((r) => ({ key: r, cells: [r] }))} />
        </Panel>
        <Panel title="Agentic loop pairs">
          <CheckInput id="loopInternalApply" label="Apply internal loop (token-cost estimate, no FTE/€ impact)" />
          <CheckInput id="loopExternalApply" label="Apply external rework (majors destination-phase effort/€)" />
          <SimpleTable align={['left', 'left', 'center', 'left', 'center', 'center', 'center']}
            head={['Pair', 'Artefacts', 'Internal iterations', 'External rework', 'Cost share', 'Internal token cost (est.)', 'External effort added']}
            rows={loops.map((l) => ({ key: l.label, cells: [<b>{l.label}</b>, l.arts, l.internal, l.external, l.share, l.tokens, l.added] }))} />
        </Panel>
      </>} />
  );
}
