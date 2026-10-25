import { useActiveProductId, useProductRows, useWaves } from '@/store/portfolioHooks';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AddProduct } from './AddProduct';
import { ProductRowView } from './ProductRowView';

const help = (
  <>
    <p>One row per product of the portfolio. Each product has its <strong>own entry team</strong> (never shared) and inherits every other value from the
      common case until it overrides it (see 🧬 Overrides). The indicators are those of the product&apos;s effective case, computed alone by the same engine
      as the headline bar.</p>
    <p>Every action is one undoable step (Ctrl+Z), including removal. The active product is the one all other sections edit and the headline bar shows.</p>
  </>
);

const COLS: [string, string][] = [
  ['Product', ''], ['Wave', 'Wave of the product: editable here or in the Waves section (drag and drop, keyboard)'],
  ['Offset (months)', 'The product’s own offset within its wave'], ['Base FTE', 'Entry team of the product'],
  ['State', 'inherited, or number of overridden values'], ['End-of-horizon savings', 'Savings of the last year of the product’s horizon'],
  ['Payback', 'Payback month of the product'],
  ['Note', ''], ['Actions', ''],
];

/**
 * Products — the products table: team, wave, state and key indicators, with add / rename / duplicate / archive / remove / note / offset and the
 * active product.
 */
export default function ProductsSection() {
  const rows = useProductRows(), active = useActiveProductId(), waves = useWaves();
  return (
    <SectionFrame title="📦 Products" help={help}
      input={<AddProduct />}
      result={
        <>
          <div className="ac-table-wrap" tabIndex={0}>
            <table className="ac-table ac-pf-table">
              <caption>Products of the portfolio ({rows.length})</caption>
              <thead><tr>{COLS.map(([h, t]) => <th key={h} scope="col" title={t || undefined}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => <ProductRowView
                key={r.product.id}
                row={r}
                index={i}
                active={r.product.id === active}
                last={rows.length === 1}
                waves={waves}
              />)}</tbody>
            </table>
          </div>
          <Callout>Savings and payback are those of the product alone (its own calculation engine); the consolidated trajectory of the portfolio is in the
            Consolidation section, the assignment to waves in the Waves section.</Callout>
        </>
      } />
  );
}
