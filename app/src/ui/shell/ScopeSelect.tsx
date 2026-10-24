import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { useDisplayScope } from '@/store/consolidationHooks';
import { useActiveProductId, useEditScope, useProducts, useWaves } from '@/store/portfolioHooks';
import { toast } from '../uiState';

/**
 * "View": the single selector of the top bar. It picks what the headline bar, the Gantt and the report show — the Portfolio, a Wave, or a
 * Product — and choosing a Product also makes it the product the sections edit (F17). With the Portfolio or a Wave in view, the product
 * still being edited stays visible next to the selector ("Editing: All products" or "Editing: <name>", as the Edit dropdown says). View state: not undoable, not saved. Announced in the live region.
 */
export function ScopeSelect() {
  const scope = useDisplayScope(), products = useProducts(), waves = useWaves(), active = useActiveProductId(), all = useEditScope() === 'all';
  const value = scope.kind === 'portfolio' ? 'portfolio' : scope.kind === 'wave' ? `wave:${scope.id}` : `product:${active}`;
  const pick = (v: string) => {
    const [kind, id = ''] = v.split(':');
    if (kind === 'portfolio') { if (setDisplayScope({ kind: 'portfolio' })) toast('View: Portfolio'); }
    else if (kind === 'wave') { if (setDisplayScope({ kind: 'wave', id })) toast(`View: ${waves.find((w) => w.id === id)?.name ?? id}`); }
    else if (showProduct(id)) toast(`View: product ${products.find((p) => p.id === id)?.name ?? id} (edited)`);
  };
  const waveOf = (id: string | null) => waves.find((w) => w.id === id)?.name ?? 'unscheduled';
  const edited = products.find((p) => p.id === active);
  return (
    <>
      <label className="ac-prodsel ac-scopesel" title="What the indicators of the top bar, the Gantt and the report show: the consolidated portfolio, a wave, or a product. Choosing a product also edits it in the sections.">View{' '}
        <select aria-label="View" value={value} onChange={(e) => pick(e.target.value)}>
          <option value="portfolio">Portfolio</option>
          <optgroup label="Waves">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>Wave: {w.name}</option>)}</optgroup>
          <optgroup label="Products">{products.map((p) => <option key={p.id} value={`product:${p.id}`}>Product: {p.name} — {waveOf(p.waveId)}{p.archived ? ' (archived)' : ''}</option>)}</optgroup>
        </select>
      </label>
      {scope.kind !== 'product' && edited && <span className="ac-editing">Editing: <strong>{all ? 'All products' : edited.name}</strong></span>}
    </>
  );
}
