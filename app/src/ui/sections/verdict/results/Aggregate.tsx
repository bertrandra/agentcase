import { fmtRoiPct } from '@/domain/economics/roi';
import { usePortfolioDecision } from '@/store/portfolioSimulation';
import { useResultsAggregate } from '@/store/selectionHooksVerdict';
import { useVerdictGroup } from '@/store/portfolioSimulation';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { StatRow } from '@/ui/widgets/cards';
import { ScopeUnavailable } from '@/ui/widgets/ScopeUnavailable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ExcludedNote } from '../../economics/AggParts';
import { AggBanner } from './AggBanner';
import { Kpi } from './Kpi';
import { SavingsAndTeam, UncertaintyPanel } from './Parts';

const help = (
  <>
    <p>The business case of the <strong>selection</strong> (Portfolio or one Wave) on one screen: the confidence-conditional verdict of its Monte Carlo
    distribution, the consolidated key figures, the uncertainty band, where the savings come from and the human to agent team shift.</p>
    <p>Money figures are the consolidated calendar flows; the decomposition and the team shift add up the products&apos; own last-year figures. Choose a
      product in “Show” for the single-product Results.</p>
  </>
);
const R = 'right' as const;

/**
 * Results — aggregate view (R-conso): verdict, key figures, uncertainty band, savings decomposition and team shift of the Portfolio / Wave, and the
 * figures of each product.
 */
export default function ResultsAggregate() {
  const a = useResultsAggregate(), group = useVerdictGroup(), d = usePortfolioDecision(group);
  if (!a) return null;
  const t = a.totals, s = d?.stats, fin = !!s && isFinite(s.p10), L = a.last, T = a.team;
  const cols: AggColumn<(typeof a.rows)[number]>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave }, { key: 'status', header: 'Status', render: (r) => r.status },
    { key: 'setup', header: 'Setup', align: R, render: (r) => fmtEurK(r.setup) }, { key: 'net', header: 'Net', align: R, render: (r) => fmtEurK(r.net) },
    { key: 'roi', header: 'ROI', align: R, render: (r) => fmtRoiPct(r.roi) },
    { key: 'pay', header: 'Payback', align: R, render: (r) => fmtMonths(r.paybackMonth) },
    { key: 'eff', header: 'Automation depth', align: R, render: (r) => `${r.eff.toFixed(1)}%` },
  ];
  return (
    <SectionFrame title={`📋 Results — consolidated outcome — ${a.label}`} help={help}
      result={<>
        <p className="ac-muted">Consolidated outcome of the selection: {a.label} ({a.rows.length} planned product{a.rows.length > 1 ? 's' : ''}): the verdict
          of its distribution, the key figures, the uncertainty band, where the savings come from and the team shift.</p>
        {group?.kind === 'unit' ? <ScopeUnavailable what="Probabilistic verdict" label={a.label} /> : <AggBanner d={d} label={a.label} />}
        <StatRow>
          <Kpi label="Net benefit" value={fmtEurK(t.net)} tone={t.net < 0 ? 'brick' : 'blue'} sub={`after ${fmtEurK(t.setup)} setup`} />
          <Kpi label="ROI" value={fmtRoiPct(t.roi)} tone={t.roi != null && t.roi < 0 ? 'brick' : 'teal'} sub="on setup investment" />
          <Kpi label="Payback" value={fmtMonths(t.paybackMonth)} tone="blue" sub="consolidated cumulative turns positive" />
          <Kpi label="Automation depth" value={`${t.eff.toFixed(1)}%`} tone="amber" sub="weighted by entry headcount" />
        </StatRow>
        {d && s && fin && <UncertaintyPanel title={`Uncertainty (portfolio Monte Carlo, ${s.n} draws)`} s={s} />}
        <SavingsAndTeam savingsTitle="Savings decomposition (last year of each product)" teamTitle="Team shift (horizon end of each product)" b={L} team={T} />
        <AggregateTable caption={`Results by product — ${a.label}`} rows={a.rows} columns={cols} edit={false}
          totals={{ label: `Total — ${a.label}`, cells: { setup: fmtEurK(t.setup), net: fmtEurK(t.net), roi: fmtRoiPct(t.roi), pay: fmtMonths(t.paybackMonth),
            eff: `${t.eff.toFixed(1)}%` } }} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
