import { fmtRoiPct } from '@/domain/economics/roi';
import { pNegTone } from '@/domain/stress';
import { usePortfolioDecision } from '@/store/portfolioSimulation';
import { useResultsAggregate } from '@/store/selectionHooksVerdict';
import { useVerdictGroup } from '@/store/portfolioSimulation';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Panel, StatRow } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ExcludedNote } from '../../economics/AggParts';
import { fmtEur } from '../../stress/fmt';
import { AggBanner } from './AggBanner';
import { Kpi } from './Kpi';

const help = (
  <>
    <p>The business case of the <strong>selection</strong> (Portfolio or one Wave) on one screen: the confidence-conditional verdict of its Monte Carlo distribution, the consolidated key figures, the uncertainty band,
      where the savings come from and the human to agent team shift.</p>
    <p>Money figures are the consolidated calendar flows; the decomposition and the team shift add up the products&apos; own last-year figures. Choose a Product in the View selector for the single-product Results.</p>
  </>
);
const R = 'right' as const;

/** Results — aggregate view (R-conso): verdict, key figures, uncertainty band, savings decomposition and team shift of the Portfolio / Wave, and the figures of each product. */
export default function ResultsAggregate() {
  const a = useResultsAggregate(), group = useVerdictGroup(), d = usePortfolioDecision(group);
  if (!a) return null;
  const t = a.totals, s = d?.stats, fin = !!s && isFinite(s.p10), L = a.last, T = a.team;
  const cols: AggColumn<(typeof a.rows)[number]>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave }, { key: 'status', header: 'Status', render: (r) => r.status },
    { key: 'setup', header: 'Setup', align: R, render: (r) => fmtEurK(r.setup) }, { key: 'net', header: 'Net', align: R, render: (r) => fmtEurK(r.net) },
    { key: 'roi', header: 'ROI', align: R, render: (r) => fmtRoiPct(r.roi) }, { key: 'pay', header: 'Payback', align: R, render: (r) => fmtMonths(r.paybackMonth) },
    { key: 'eff', header: 'Automation depth', align: R, render: (r) => `${r.eff.toFixed(1)}%` },
  ];
  return (
    <SectionFrame title={`📋 Results — consolidated outcome — ${a.label}`} help={help}
      result={<>
        <p className="ac-muted">Consolidated outcome of the selection: {a.label} ({a.rows.length} planned product{a.rows.length > 1 ? 's' : ''}): the verdict of its distribution, the key figures, the uncertainty band, where the savings come from and the team shift.</p>
        <AggBanner d={d} label={a.label} />
        <StatRow>
          <Kpi label="Net benefit" value={fmtEurK(t.net)} tone={t.net < 0 ? 'brick' : 'blue'} sub={`after ${fmtEurK(t.setup)} setup`} />
          <Kpi label="ROI" value={fmtRoiPct(t.roi)} tone={t.roi != null && t.roi < 0 ? 'brick' : 'teal'} sub="on setup investment" />
          <Kpi label="Payback" value={fmtMonths(t.paybackMonth)} tone="blue" sub="consolidated cumulative turns positive" />
          <Kpi label="Automation depth" value={`${t.eff.toFixed(1)}%`} tone="amber" sub="weighted by entry headcount" />
        </StatRow>
        {d && s && fin && (
          <Panel title={`Uncertainty (portfolio Monte Carlo, ${s.n} draws)`}>
            <StatRow>
              <Kpi label="P10 downside" value={fmtEur(s.p10)} tone={s.p10 < 0 ? 'brick' : 'teal'} /><Kpi label="P50 median" value={fmtEur(s.p50)} tone="blue" />
              <Kpi label="P90 upside" value={fmtEur(s.p90)} tone="teal" /><Kpi label="P(net < 0)" value={`${Math.round(s.pNetNeg * 100)}%`} tone={pNegTone(s.pNetNeg)} />
            </StatRow>
          </Panel>
        )}
        <div className="ac-form-row" style={{ alignItems: 'stretch' }}>
          <Panel title="Savings decomposition (last year of each product)">
            <div style={{ lineHeight: 'var(--ac-leading-code)' }}>
              <b style={{ color: 'var(--ac-teal)' }}>{fmtEur(L.grossAuto)}</b> gross automation<br />
              <b style={{ color: 'var(--ac-brick)' }}>−{fmtEur(L.agentCost)}</b> agent operating cost<br />
              <b style={{ color: 'var(--ac-amber)' }}>{L.relocation >= 0 ? '+' : ''}{fmtEur(L.relocation)}</b> relocation<br />
              <b style={{ color: 'var(--ac-blue)' }}>= {fmtEur(L.total)} total savings / yr</b>
            </div>
          </Panel>
          <Panel title="Team shift (horizon end of each product)">
            <div style={{ lineHeight: 'var(--ac-leading-code)' }}>
              <strong>{T.asis.toFixed(1)}</strong> AS-IS human FTE →<br />
              <b style={{ color: 'var(--ac-blue)' }}>{T.human.toFixed(1)}</b> residual human FTE + <b style={{ color: 'var(--ac-info-700)' }}>{T.agent.toFixed(1)}</b> agent vFTE
            </div>
          </Panel>
        </div>
        <AggregateTable caption={`Results by product — ${a.label}`} rows={a.rows} columns={cols} edit={false}
          totals={{ label: `Total — ${a.label}`, cells: { setup: fmtEurK(t.setup), net: fmtEurK(t.net), roi: fmtRoiPct(t.roi), pay: fmtMonths(t.paybackMonth), eff: `${t.eff.toFixed(1)}%` } }} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
