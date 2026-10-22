import { useMemo } from 'react';
import type { PfStress } from '@/domain/portfolio';
import { pNegTone } from '@/domain/stress';
import { Callout, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { goSection } from '@/ui/uiState';
import { histogram } from '../../stress/montecarlo/RunResults';
import { fmtEur } from '../../stress/fmt';
import { Tables } from './Tables';

/** Cards, distribution, diversification and the by-wave / by-product tables of the last portfolio run. */
export function Results({ run, stale, rerun }: { run: PfStress; stale: boolean; rerun: () => void }) {
  const s = run.stats, d = run.diversification;
  const config = useMemo(() => {
    const h = histogram(run.outcomes), plugins = { ...(h.options?.plugins ?? {}), title: { display: true, text: 'Distribution du bénéfice net du portefeuille (somme des produits, après mise en place)' } };
    return { ...h, options: { ...h.options, plugins } };
  }, [run]);
  const tone = (v: number) => (v < 0 ? 'brick' : 'teal');
  return (
    <>
      {stale && (
        <Callout kind="warn">⚠️ <strong>Le portefeuille a changé depuis la dernière simulation</strong> — la distribution et le verdict de portefeuille sont périmés.{' '}
          <button type="button" onClick={rerun}>⟳ Relancer</button></Callout>
      )}
      <StatRow>
        <Stat label="P10 (aléa défavorable)" value={fmtEur(s.p10)} tone={tone(s.p10)} /><Stat label="P50 (médiane)" value={fmtEur(s.p50)} tone={s.p50 < 0 ? 'brick' : 'blue'} />
        <Stat label="P90 (aléa favorable)" value={fmtEur(s.p90)} tone="teal" /><Stat label="P(net < 0)" value={`${Math.round(s.pNetNeg * 100)} %`} tone={pNegTone(s.pNetNeg)} />
        <Stat label="CVaR 10 %" value={fmtEur(s.cvar10)} tone="amber" /><Stat label="Moyenne" value={fmtEur(s.mean)} tone="blue" />
        <Stat label="Tirages · graine · ρ" value={`${run.draws} · ${run.seed} · ${String(run.rho).replace('.', ',')}`} tone="grey" />
      </StatRow>
      <Panel title="Distribution du portefeuille"><ChartPanel config={config} label="Distribution du bénéfice net du portefeuille" /></Panel>
      <Panel title="Réduction du risque (diversification)">
        <StatRow>
          <Stat label="Somme des P10 des produits" value={fmtEur(d.sumP10)} tone="grey" /><Stat label="P10 du portefeuille" value={fmtEur(d.p10)} tone={tone(d.p10)} />
          <Stat label="Réduction du risque" value={fmtEur(d.reduction)} tone="teal" hint="P10 du portefeuille moins la somme des P10 autonomes" />
        </StatRow>
        <p className="ac-muted">Ce que le portefeuille gagne sur le scénario défavorable parce que les produits ne tombent pas tous ensemble : P10 du portefeuille − Σ P10 de chaque produit seul.
          Nulle quand ρ = 1 (mêmes chocs), maximale quand les produits sont indépendants (ρ = 0).</p>
      </Panel>
      <Panel title="Par vague et par produit"><Tables waves={run.waves} products={run.products} total={s} /></Panel>
      <Callout kind="blue">La loi d’un produit pris seul est celle de sa propre simulation Monte Carlo (même tirage, graine propre au produit) : voir{' '}
        <button type="button" className="ac-link" onClick={() => goSection('montecarlo')}>🎲 Monte Carlo</button> ; le verdict de portefeuille est dans{' '}
        <button type="button" className="ac-link" onClick={() => goSection('decision')}>🧭 Decision Intelligence</button>.</Callout>
    </>
  );
}
