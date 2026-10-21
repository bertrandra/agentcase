import { agentDetail } from '@/domain/verifyA';
import { fmt1 } from '@/ui/economicsFormat';
import { Badge, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Band } from '../../economics/Band';
import { SimpleTable } from '../SimpleTable';
import { useLive } from '../useLive';
import { Runs } from './Runs';

const help = (
  <>
    <p>Agentic transformation is not "agents instead of people": it introduces a small, specialised human team that builds, operates, supervises and governs the agents.</p>
    <p>Each role is sized from your input team (see the sizing rule); the AI authorization levels decide what agents may do per artefact and how closely the human supervises.</p>
  </>
);

/** Agent details — the agentic operating team, the AI authorization levels and the agent runs per artefact. */
export default function AgentDetailSection() {
  const live = useLive(), d = agentDetail(live);
  return (
    <SectionFrame title="🤖 Agent details — the agentic operating team" help={help}
      result={<>
        <Band items={[['Agentic Run FTE', fmt1(d.runTotal)], ['Supervision pole', fmt1(d.supETP)], ['AI skill premium', '+15%'], ['Run day-rate', `€${d.runRate}`], ['Authorization levels', String(d.auth.length)]]} />
        <Runs live={live} />
        <Panel title="The 5 agentic roles">
          <SimpleTable align={['left', 'left', 'left', 'right', 'left']} head={['Role', 'Mission', 'Sizing rule', 'FTE (this case)', 'Category']}
            rows={d.roles.map((r) => ({ key: r.role, cells: [<b>{r.role}</b>, r.mission, <code>{r.rule}</code>, <b>{r.fte.toFixed(2)}</b>,
              <Badge tone={r.supervision ? 'amber' : 'teal'}>{r.supervision ? 'Supervision (residual)' : 'Agentic run'}</Badge>] }))} />
        </Panel>
        <Panel title="AI authorization levels (what an agent may do)">
          <SimpleTable align={['left', 'left', 'left', 'center', 'center']} head={['Level', 'Meaning', 'Human role', 'Artifacts at this level', 'Avg human sup.']}
            rows={d.auth.map((a) => ({ key: a.level, cells: [<b>{a.level}</b>, a.meaning, a.human, a.count, `${a.avgHuman}%`] }))} />
        </Panel>
      </>} />
  );
}
