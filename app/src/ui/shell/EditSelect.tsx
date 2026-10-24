import { chooseEditTarget } from '@/controllers/product';
import type { Product } from '@/domain/portfolio';
import { useDisplayScope } from '@/store/consolidationHooks';
import { useEditTarget } from '@/store/commonEditHooks';
import { useProducts, useWaves } from '@/store/portfolioHooks';
import { toast } from '../uiState';

const option = (p: Product) => <option key={p.id} value={p.id}>{p.name} only{p.archived ? ' (archived)' : ''}</option>;

/**
 * "Edit:" — ONE dropdown of the top bar (2+ products, every View): "All products" (the common values; the entry team stays the active product's) or
 * "<name> only" (that product becomes the edited one; its edits create overrides). With a Wave in view, the wave's products come first, then the
 * others (the edited product may be outside the wave). The View does not change: in a Product view, choosing another product shows it instead.
 * View state: no undo step, never saved. Announced in the live region.
 */
export function EditSelect() {
  const value = useEditTarget(), products = useProducts(), waves = useWaves(), scope = useDisplayScope();
  const wave = scope.kind === 'wave' ? waves.find((w) => w.id === scope.id) : undefined;
  const pick = (v: string) => {
    if (!chooseEditTarget(v)) return;
    toast(v === 'all' ? 'Edit: All products' : `Edit: ${products.find((p) => p.id === v)?.name ?? v} only`);
  };
  const inWave = wave ? products.filter((p) => wave.productIds.includes(p.id)) : [], others = products.filter((p) => !inWave.includes(p));
  return (
    <label className="ac-prodsel ac-editsel" title="Where your changes go: the common values every product inherits (All products), or one product only (an override for it). The entry team is always a product’s own.">Edit:{' '}
      <select aria-label="Edit" value={value} onChange={(e) => pick(e.target.value)}>
        <option value="all">All products</option>
        {wave ? (
          <>
            <optgroup label={`Wave: ${wave.name}`}>{inWave.map(option)}</optgroup>
            {others.length > 0 && <optgroup label="Other products">{others.map(option)}</optgroup>}
          </>
        ) : products.map(option)}
      </select>
    </label>
  );
}
