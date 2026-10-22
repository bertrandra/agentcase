import { useActiveProductId, useProductRows } from '@/store/portfolioHooks';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AddProduct } from './AddProduct';
import { ProductRowView } from './ProductRowView';

const help = (
  <>
    <p>One row per product of the portfolio. Each product has its <strong>own entry team</strong> (never shared) and inherits every other value from the common case until
      it overrides it (see 🧬 Surcharges). The indicators are those of the product&apos;s effective case, computed alone by the same engine as the headline bar.</p>
    <p>Every action is one undoable step (Ctrl+Z), including removal. The active product is the one all other sections edit and the headline bar shows.</p>
  </>
);

const COLS: [string, string][] = [
  ['Produit', ''], ['Vague', 'Vague du produit (affectation : section Vagues, à venir)'], ['Décalage (mois)', 'Décalage propre du produit dans sa vague'], ['ETP de base', 'Équipe d’entrée du produit'],
  ['État', 'hérité, ou nombre de valeurs surchargées'], ['Économies fin d’horizon', 'Économies de la dernière année de l’horizon du produit'], ['Retour', 'Mois de retour sur investissement du produit'],
  ['Note', ''], ['Actions', ''],
];

/** Produits — the products table: team, wave, state and key indicators, with add / rename / duplicate / archive / remove / note / offset and the active product. */
export default function ProductsSection() {
  const rows = useProductRows(), active = useActiveProductId();
  return (
    <SectionFrame title="📦 Produits" help={help}
      input={<AddProduct />}
      result={
        <>
          <div className="ac-table-wrap" tabIndex={0}>
            <table className="ac-table ac-pf-table">
              <caption>Produits du portefeuille ({rows.length})</caption>
              <thead><tr>{COLS.map(([h, t]) => <th key={h} scope="col" title={t || undefined}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => <ProductRowView key={r.product.id} row={r} index={i} active={r.product.id === active} last={rows.length === 1} />)}</tbody>
            </table>
          </div>
          <Callout>Les économies et le retour sont ceux du produit seul (son propre moteur de calcul) ; la consolidation du portefeuille arrive avec la section Consolidation.</Callout>
        </>
      } />
  );
}
