import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { usePortfolioSimulation } from '@/store/portfolioSimulation';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Controls } from './Controls';
import { Results } from './Results';

const help = (
  <>
    <p>Chaque produit est simulé comme dans <strong>Monte Carlo</strong> (mêmes paramètres incertains, même bénéfice net sur son horizon), avec un tirage propre : graine du run ⊕ identifiant du produit.
      Le bénéfice net du portefeuille, pour un tirage, est la <strong>somme</strong> de celui des produits planifiés ; rien n’est recalculé ici.</p>
    <p><strong>ρ</strong> règle la corrélation entre produits : chaque aléa d’un produit est √ρ · Z + √(1 − ρ) · ε, où Z est un choc commun à tous les produits et ε le choc propre du produit,
      puis ramené à la même loi marginale que dans la simulation du produit seul. ρ = 0 : indépendants (défaut) ; ρ = 1 : mêmes chocs, la diversification disparaît.
      La loi de chaque produit ne dépend pas de ρ, seul l’agrégat change. La simulation est déterministe : mêmes entrées et même graine, mêmes résultats.</p>
  </>
);

/** Stress portefeuille (F20) — Monte Carlo agrégé des produits planifiés, corrélation ρ, réduction du risque, par vague et par produit. */
export default function PortfolioStressSection() {
  const { run, stale } = usePortfolioSimulation();
  return (
    <SectionFrame title="🎲 Stress portefeuille" help={help} input={<Controls />}
      result={run ? <Results run={run} stale={stale} rerun={() => { void runPortfolioSimulation(); }} /> : <p className="ac-muted"><em>Pas de simulation : lancez la simulation pour tirer la distribution du portefeuille.</em></p>} />
  );
}
