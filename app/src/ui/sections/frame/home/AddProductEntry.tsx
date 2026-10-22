import { addProduct } from '@/controllers/product';
import { useProductCount, useWaves } from '@/store/portfolioHooks';
import { goSection, toast } from '@/ui/uiState';

/**
 * The way in to the multi-product portfolio (spec F23): with one product the Portefeuille group is not in the menu, so Welcome offers "Ajouter un produit".
 * The new product inherits the common case and joins the first wave; the group then appears, and the Produits section opens.
 */
export function AddProductEntry() {
  const count = useProductCount(), first = useWaves()[0]?.id ?? null;
  const add = () => {
    const id = addProduct(undefined, first);
    if (id) { toast('Produit ajouté — le portefeuille compte maintenant plusieurs produits'); goSection('products'); } else toast('Limite de 50 produits atteinte');
  };
  return (
    <div style={{ marginTop: 16, borderLeft: '4px solid #0058AB', paddingLeft: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <strong>📦 Portefeuille — {count === 1 ? 'un seul produit' : `${count} produits`}</strong>
        <div className="ac-muted">Plusieurs produits ? Chacun a sa propre équipe d’entrée et hérite du reste du cas, qu’il peut surcharger.</div>
      </div>
      <button type="button" onClick={add}>Ajouter un produit</button>
    </div>
  );
}
