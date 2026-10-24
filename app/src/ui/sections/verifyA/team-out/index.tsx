import { useMemo } from 'react';
import { groupRows, locRows, targetTeam, teamPoles } from '@/domain/verifyA';
import { fmt1, fmtE } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Badge, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ClassBadge } from '../../baseline/ClassBadge';
import { Band } from '../../economics/Band';
import { SimpleTable } from '../SimpleTable';
import { useLive } from '../useLive';
import { headcountChart, locChart } from './charts';
import { Poles } from './Poles';

const help = (
  <>
    <p>The target team is computed from the input team, the automation potential and the irreducible human supervision of the artefacts. It breaks down into four poles:
      <b> dev team</b> (residual production), <b>supervision</b> (review of AI outputs), <b>agentic setup</b> (transitional) and <b>agentic run</b> (AI engineer, FinOps, AI-QA).</p>
    <p>The location distribution applies the target mix of the Location strategy to the whole target team.</p>
  </>
);
const TONE = { dev: 'blue', sup: 'amber', run: 'teal', setup: 'grey' } as const;

/** Target team (TO-BE, horizon end) — computed breakdown into poles, by location and as a headcount comparison. */
export default function TeamOutSection() {
  const live = useLive(), t = targetTeam(live), poles = teamPoles(live, t), locs = locRows(live, t), groups = groupRows(live, t), base = live.m.base.etp;
  const locCfg = useMemo(() => locChart(locs), [locs]), headCfg = useMemo(() => headcountChart(base, t), [base, t]);
  return (
    <SectionFrame title="Target team (TO-BE Y3) — computed breakdown" help={help}
      result={<>
        <p className="ac-muted">The target team is computed from the input team, the automation potential and the irreducible human supervision of
          artifacts. It breaks down into 4 poles: DEV TEAM (residual production) · SUPERVISION (review/validation of AI outputs) · AGENTIC SETUP
          (setup) · AGENTIC RUN(AI Engineer, FinOps, AI-QA).</p>
        <Band items={[['Input (FTE)', fmt1(base)], ['Target Dev', fmt1(t.devETP)], ['Supervision', fmt1(t.supETP)], ['Agentic run (en plus)', fmt1(t.runETP)],
          ['Total recurring target', fmt1(t.totalRecurrent)], ['Net reduction', `-${Math.round((1 - t.totalRecurrent / base) * 100)}%`]]} />
        <Panel title="🌍 Distribution by location — input vs target">
          <ChartPanel config={locCfg} label="Share of effort by location, AS-IS and target" height={220} />
          <SimpleTable align={['left', 'left', 'center', 'right', 'center', 'right', 'right']} head={['Location', 'Class', '% AS-IS', 'FTE AS-IS', 'Target %', 'Target FTE (estimated)', 'Day rate']}
            rows={locs.map((r) => ({ key: r.name, cells: [r.name, <ClassBadge cls={r.cls} />, `${r.asisPct.toFixed(0)}%`, fmt1(r.asisFte), `${r.tgtPct.toFixed(0)}%`, fmt1(r.tgtFte), `€${Math.round(r.rate)}`] }))} />
        </Panel>
        <Poles poles={poles} />
        <Panel title="Headcount comparison input → target"><ChartPanel config={headCfg} label="Headcount, input versus target" height={220} /></Panel>
        <Panel title="Target team poles detail">
          <SimpleTable align={['left', 'left', 'center', 'right', 'center']} head={['Group', 'Composition', 'FTE', 'Annual cost', 'Type']}
            rows={groups.map((g) => ({ key: g.group, cells: [<b>{g.group}</b>, g.composition, fmt1(g.fte), fmtE(g.cost), <Badge tone={TONE[g.tone]}>{g.kind}</Badge>] }))} />
        </Panel>
      </>} />
  );
}
