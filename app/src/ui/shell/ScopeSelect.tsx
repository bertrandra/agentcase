import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { useDisplayScope } from '@/store/consolidationHooks';
import { useActiveProductId, useProducts, useWaves } from '@/store/portfolioHooks';
import { toast } from '../uiState';

/**
 * "Vue": the single selector of the top bar. It picks what the headline bar, the Gantt and the report show — the Portefeuille, a Vague, or a
 * Produit — and choosing a Produit also makes it the product the sections edit (F17). With the Portefeuille or a Vague in view, the product
 * still being edited stays visible next to the selector. View state: not undoable, not saved. Announced in the live region.
 */
export function ScopeSelect() {
  const scope = useDisplayScope(), products = useProducts(), waves = useWaves(), active = useActiveProductId();
  const value = scope.kind === 'portfolio' ? 'portfolio' : scope.kind === 'wave' ? `wave:${scope.id}` : `product:${active}`;
  const pick = (v: string) => {
    const [kind, id = ''] = v.split(':');
    if (kind === 'portfolio') { if (setDisplayScope({ kind: 'portfolio' })) toast('Vue : Portefeuille'); }
    else if (kind === 'wave') { if (setDisplayScope({ kind: 'wave', id })) toast(`Vue : ${waves.find((w) => w.id === id)?.name ?? id}`); }
    else if (showProduct(id)) toast(`Vue : produit ${products.find((p) => p.id === id)?.name ?? id} (édité)`);
  };
  const waveOf = (id: string | null) => waves.find((w) => w.id === id)?.name ?? 'non planifié';
  const edited = products.find((p) => p.id === active);
  return (
    <>
      <label className="ac-prodsel ac-scopesel" title="Ce que montrent les indicateurs de la barre haute, le Gantt et le rapport : le portefeuille consolidé, une vague, ou un produit. Choisir un produit l’édite aussi dans les sections.">Vue{' '}
        <select aria-label="Vue" value={value} onChange={(e) => pick(e.target.value)}>
          <option value="portfolio">Portefeuille</option>
          <optgroup label="Vagues">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>Vague : {w.name}</option>)}</optgroup>
          <optgroup label="Produits">{products.map((p) => <option key={p.id} value={`product:${p.id}`}>Produit : {p.name} — {waveOf(p.waveId)}{p.archived ? ' (archivé)' : ''}</option>)}</optgroup>
        </select>
      </label>
      {scope.kind !== 'product' && edited && <span className="ac-muted ac-editing">Édition : <strong>{edited.name}</strong></span>}
    </>
  );
}
