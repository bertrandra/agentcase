import { useMemo } from 'react';
import { useTheme } from '@/ui/themeContext';
import { fteSeries, fteSummary, periodRows } from '@/domain/verifyA';
import { fmt1 } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Band } from '../../economics/Band';
import { SimpleTable } from '../SimpleTable';
import { useLive } from '../useLive';
import { fteChart } from './chart';
import { Maturity } from './Maturity';

const help = (
  <>
    <p>The clearest picture of the transformation: humans going down, agents coming up, the <b>total staying flat</b> (effort conservation).</p>
    <p>Human FTE(t) = base team × (1 − realized automation(t)); Agent vFTE(t) = base team × realized automation(t). A vFTE is absorbed effort, not a person or
      a licence.</p>
    <p>The vertical L1–L4 markers show where the adoption curve crosses each maturity threshold.</p>
  </>
);

/** FTE / vFTE chart — human FTE decreasing, agent vFTE growing, total effort constant, plus the maturity mapping. */
export default function FteVfteSection() {
  const live = useLive(), rows = periodRows(live), s = fteSummary(live), { tok } = useTheme(), cfg = useMemo(() => fteChart(fteSeries(live), tok), [live, tok]);
  return (
    <SectionFrame title="FTE / vFTE Chart" help={help}
      result={<>
        <p className="ac-muted">Effort evolution over the horizon: Human FTE decreases, Agent vFTE grows, and the Total effort (FTE-eq) stays constant
          (conservation). Contextual to your input team and the automation potential.</p>
        <ChartPanel config={cfg} label="Human FTE and agent vFTE by month, with the maturity levels" height={300} />
        <Band items={[[`Total effort (FTE-eq) ${s.endLabel}`, fmt1(s.total)], [`Agent vFTE ${s.endLabel}`, fmt1(s.agent)],
          ['Effort reduction', s.reduction === null ? '—' : `${s.reduction}%`], ['Freed capacity', `${fmt1(s.freed)} FTE`]]} />
        <SimpleTable align={['left', 'center', 'right', 'right', 'right', 'center']} head={['Period', 'Ramp', 'Human FTE', 'Agent vFTE',
          'Total effort (FTE-eq)', 'Freed capacity']}
          rows={rows.map((r) => ({ key: r.label, cells: [r.label, `${Math.round(r.ramp)}%`, fmt1(r.human), fmt1(r.agent), fmt1(r.total),
            `${fmt1(r.freed)} FTE`] }))} />
        <Maturity live={live} />
      </>} />
  );
}
