import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { useDisplayScope } from '@/store/consolidationHooks';
import { useActiveProductId, useProducts, useWaves } from '@/store/portfolioHooks';
import { toast } from '../uiState';

/**
 * "👁 Show": the single selector of the top bar. It picks what the headline bar, the Gantt and the report show — the Portfolio, a Wave, or a
 * Product — and "Change follows Show" (F17 revised): a Product also becomes the edited product and the edit target; the Portfolio or a Wave sets the
 * edit target back to All products (`controllers/displayScope.ts`). View state: not undoable, not saved. Announced in the live region ("Showing X").
 */
export function ScopeSelect() {
  const scope = useDisplayScope(), products = useProducts(), waves = useWaves(), active = useActiveProductId();
  const value = scope.kind === 'portfolio' ? 'portfolio' : scope.kind === 'wave' ? `wave:${scope.id}` : `product:${active}`;
  const pick = (v: string) => {
    const [kind, id = ''] = v.split(':');
    if (kind === 'portfolio') { if (setDisplayScope({ kind: 'portfolio' })) toast('Showing Portfolio'); }
    else if (kind === 'wave') { if (setDisplayScope({ kind: 'wave', id })) toast(`Showing ${waves.find((w) => w.id === id)?.name ?? id}`); }
    else if (showProduct(id)) toast(`Showing ${products.find((p) => p.id === id)?.name ?? id}`);
  };
  const waveOf = (id: string | null) => waves.find((w) => w.id === id)?.name ?? 'unscheduled';
  return (
    <label className="ac-prodsel ac-scopesel" title="What you look at: the portfolio, a wave or one product">
      <span className="ac-prodsel-icon" aria-hidden="true">👁</span>Show{' '}
      <select aria-label="Show" value={value} onChange={(e) => pick(e.target.value)}>
        <option value="portfolio">Portfolio</option>
        <optgroup label="Waves">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>{w.name}</option>)}</optgroup>
        <optgroup label="Products">{products.map((p) => <option key={p.id} value={`product:${p.id}`}>{p.name} ({waveOf(p.waveId)}){p.archived ? ' (archived)' : ''}</option>)}</optgroup>
      </select>
    </label>
  );
}
