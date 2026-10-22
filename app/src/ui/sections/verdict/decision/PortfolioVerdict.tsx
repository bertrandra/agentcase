import { fmtRoiPct } from '@/domain/economics/roi';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import type { VerdictGroup } from '@/domain/portfolio';
import { VERDICT_META } from '@/domain/verdict';
import { useScopeKpis } from '@/store/consolidationHooks';
import { usePortfolioDecision, usePortfolioSimulation, useWaveDecisions } from '@/store/portfolioSimulation';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { Callout, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { goSection } from '@/ui/uiState';
import { fmtEur } from '../../stress/fmt';
import { VerdictBox } from './VerdictBox';

function Stale() {
  const { stale } = usePortfolioSimulation();
  return stale ? (
    <Callout kind="warn">⚠️ <strong>The portfolio changed since the last simulation</strong> — the verdict below is stale.{' '}
      <button type="button" onClick={() => { void runPortfolioSimulation(); }}>⟳ Run again</button></Callout>
  ) : null;
}

function WaveVerdicts() {
  const rows = useWaveDecisions();
  return (
    <Panel title="Verdict by wave">
      <DataTable caption="Verdict of each wave" rows={rows} rowKey={(r) => r.id} empty="No wave simulated." columns={[
        { key: 'w', header: 'Wave', render: (r) => <strong>{r.name}</strong> },
        { key: 'v', header: 'Verdict', render: (r) => (r.decision ? `${VERDICT_META[r.decision.verdict].icon} ${VERDICT_META[r.decision.verdict].short}` : 'n/a') },
        { key: 'c', header: 'Confidence', align: 'right', render: (r) => (r.decision ? `${r.decision.confidence}%` : '') },
        { key: 'p10', header: 'P10', align: 'right', render: (r) => (r.decision ? fmtEur(r.decision.stats.p10) : '') },
        { key: 'p50', header: 'P50', align: 'right', render: (r) => (r.decision ? fmtEur(r.decision.stats.p50) : '') },
      ]} />
    </Panel>
  );
}

/**
 * The verdict of the display scope Portfolio / Wave: the Decision Intelligence rule applied to the portfolio (or wave) distribution of the
 * portfolio Monte Carlo, next to the deterministic net, ROI and payback of the same scope. A table gives the verdict of every wave.
 */
export function PortfolioVerdict({ group }: { group: VerdictGroup }) {
  const { run } = usePortfolioSimulation(), d = usePortfolioDecision(group), kpis = useScopeKpis(), h = kpis?.headline;
  return (
    <>
      {h && (
        <StatRow>
          <Stat label={`Net · ${kpis.label}`} value={fmtEurK(h.net)} tone={h.net < 0 ? 'brick' : 'teal'} /><Stat label="ROI" value={fmtRoiPct(h.roi)} />
          <Stat label="Payback (months)" value={fmtMonths(h.paybackMonth)} /><Stat label="Calendar NPV" value={fmtEurK(h.npv)} />
        </StatRow>
      )}
      {d ? <Panel title={`Verdict — ${kpis?.label ?? 'scope'}`}><VerdictBox d={d} banner={<Stale />} /></Panel> : (
        <p className="ac-muted"><em>{run ? 'This scope has no scheduled product in the simulation.' : (
          <>Run the portfolio simulation first (Portfolio → 🎲 Portfolio stress): the verdict is computed on the distribution, never on a point estimate.{' '}
            <button type="button" onClick={() => { void runPortfolioSimulation(); }}>▶ Run now</button></>)}</em></p>
      )}
      {run && <WaveVerdicts />}
      <p className="ac-muted">Same rules as for a product, applied to the distribution of the scope; P10 floor on the sum of the setups; the bar uplift is the average
        of the products weighted by entry headcount. Details in{' '}
        <button type="button" className="ac-link" onClick={() => goSection('portfolio-stress')}>🎲 Portfolio stress</button>.</p>
    </>
  );
}
