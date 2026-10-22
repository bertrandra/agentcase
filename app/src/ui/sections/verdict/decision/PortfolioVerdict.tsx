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
    <Callout kind="warn">⚠️ <strong>Le portefeuille a changé depuis la dernière simulation</strong> — le verdict ci-dessous est périmé.{' '}
      <button type="button" onClick={() => { void runPortfolioSimulation(); }}>⟳ Relancer</button></Callout>
  ) : null;
}

function WaveVerdicts() {
  const rows = useWaveDecisions();
  return (
    <Panel title="Verdict par vague">
      <DataTable caption="Verdict de chaque vague" rows={rows} rowKey={(r) => r.id} empty="Aucune vague simulée." columns={[
        { key: 'w', header: 'Vague', render: (r) => <strong>{r.name}</strong> },
        { key: 'v', header: 'Verdict', render: (r) => (r.decision ? `${VERDICT_META[r.decision.verdict].icon} ${VERDICT_META[r.decision.verdict].short}` : 'n/a') },
        { key: 'c', header: 'Confiance', align: 'right', render: (r) => (r.decision ? `${r.decision.confidence} %` : '') },
        { key: 'p10', header: 'P10', align: 'right', render: (r) => (r.decision ? fmtEur(r.decision.stats.p10) : '') },
        { key: 'p50', header: 'P50', align: 'right', render: (r) => (r.decision ? fmtEur(r.decision.stats.p50) : '') },
      ]} />
    </Panel>
  );
}

/**
 * The verdict of the display scope Portefeuille / Vague: the Decision Intelligence rule applied to the portfolio (or wave) distribution of the
 * portfolio Monte Carlo, next to the deterministic net, ROI and payback of the same scope. A table gives the verdict of every wave.
 */
export function PortfolioVerdict({ group }: { group: VerdictGroup }) {
  const { run } = usePortfolioSimulation(), d = usePortfolioDecision(group), kpis = useScopeKpis(), h = kpis?.headline;
  return (
    <>
      {h && (
        <StatRow>
          <Stat label={`Net · ${kpis.label}`} value={fmtEurK(h.net)} tone={h.net < 0 ? 'brick' : 'teal'} /><Stat label="ROI" value={fmtRoiPct(h.roi)} />
          <Stat label="Retour (mois)" value={fmtMonths(h.paybackMonth)} /><Stat label="VAN calendaire" value={fmtEurK(h.npv)} />
        </StatRow>
      )}
      {d ? <VerdictBox d={d} banner={<Stale />} /> : (
        <p className="ac-muted"><em>{run ? 'Ce périmètre n’a aucun produit planifié dans la simulation.' : (
          <>Lancez d’abord la simulation de portefeuille (Portefeuille → 🎲 Stress portefeuille) : le verdict est calculé sur la distribution, jamais sur une estimation ponctuelle.{' '}
            <button type="button" onClick={() => { void runPortfolioSimulation(); }}>▶ Lancer maintenant</button></>)}</em></p>
      )}
      {run && <WaveVerdicts />}
      <p className="ac-muted">Mêmes règles que pour un produit, appliquées à la distribution du périmètre ; plancher de P10 sur la somme des mises en place ; majoration des barres moyenne
        des produits pondérée par l’effectif d’entrée. Détail dans{' '}
        <button type="button" className="ac-link" onClick={() => goSection('portfolio-stress')}>🎲 Stress portefeuille</button>.</p>
    </>
  );
}
