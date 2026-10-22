import { addProduct } from '@/controllers/product';
import { useProductCount, useWaves } from '@/store/portfolioHooks';
import { goSection, toast } from '@/ui/uiState';

/**
 * The way in to the multi-product portfolio (spec F23): with one product the Portfolio group is not in the menu, so Welcome offers "Add a product".
 * The new product inherits the common case and joins the first wave; the group then appears, and the Products section opens.
 */
export function AddProductEntry() {
  const count = useProductCount(), first = useWaves()[0]?.id ?? null;
  const add = () => {
    const id = addProduct(undefined, first);
    if (id) { toast('Product added — the portfolio now holds several products'); goSection('products'); } else toast('Limit of 50 products reached');
  };
  return (
    <div style={{ marginTop: 16, borderLeft: '4px solid #0058AB', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <strong>📦 Portfolio — {count === 1 ? 'a single product' : `${count} products`}</strong>
        <div className="ac-muted">Several products? Each has its own entry team and inherits the rest of the case, which it can override.</div>
      </div>
      <button type="button" onClick={add}>Add a product</button>
    </div>
  );
}
