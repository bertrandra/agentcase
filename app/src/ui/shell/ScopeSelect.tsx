import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { useDisplayScope } from '@/store/consolidationHooks';
import { useActiveProductId, useProducts, useWaves } from '@/store/portfolioHooks';
import { toast } from '../uiState';

/**
 * "Périmètre d'affichage" (F17): which figures the headline bar shows. Portefeuille and Vague X read the consolidated series; a Produit is the
 * active product, exactly as before (choosing one makes it the active product). View state: not undoable, not saved. Announced in the live region.
 */
export function ScopeSelect() {
  const scope = useDisplayScope(), products = useProducts(), waves = useWaves(), active = useActiveProductId();
  const value = scope.kind === 'portfolio' ? 'portfolio' : scope.kind === 'wave' ? `wave:${scope.id}` : `product:${active}`;
  const pick = (v: string) => {
    const [kind, id = ''] = v.split(':');
    if (kind === 'portfolio') { if (setDisplayScope({ kind: 'portfolio' })) toast('Périmètre d’affichage : Portefeuille'); }
    else if (kind === 'wave') { if (setDisplayScope({ kind: 'wave', id })) toast(`Périmètre d’affichage : ${waves.find((w) => w.id === id)?.name ?? id}`); }
    else if (showProduct(id)) toast(`Périmètre d’affichage : produit ${products.find((p) => p.id === id)?.name ?? id}`);
  };
  return (
    <label className="ac-prodsel ac-scopesel" title="Les indicateurs de la barre haute sont ceux de ce périmètre : le portefeuille consolidé, une vague, ou le produit actif.">Périmètre{' '}
      <select aria-label="Périmètre d'affichage" value={value} onChange={(e) => pick(e.target.value)}>
        <option value="portfolio">Portefeuille</option>
        <optgroup label="Vagues">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>Vague : {w.name}</option>)}</optgroup>
        <optgroup label="Produits">{products.map((p) => <option key={p.id} value={`product:${p.id}`}>Produit : {p.name}{p.id === active ? ' (actif)' : ''}</option>)}</optgroup>
      </select>
    </label>
  );
}
