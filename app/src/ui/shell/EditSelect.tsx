import { chooseEditTarget } from '@/controllers/product';
import type { Product } from '@/domain/portfolio';
import { useScopeMembers } from '@/store/consolidationHooks';
import { useEditTarget } from '@/store/commonEditHooks';
import { useProducts } from '@/store/portfolioHooks';
import { toast } from '../uiState';

const option = (p: Product) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archived)' : ''}</option>;

/**
 * "✏️ Change" — ONE dropdown of the top bar (2+ products, every Show): "All products" (the shared values; the entry team stays the active product's)
 * or "<name>" (that product becomes the edited one; its edits create overrides). With a Wave or a Unit shown, its products come first, then the
 * others (the edited product may be outside it). Show does not change: in a Product view, choosing another product shows it instead.
 * "Change follows Show": the Show selector resets this choice (`controllers/displayScope.ts`). View state: no undo step, never saved. Announced in
 * the live region.
 */
export function EditSelect() {
  const value = useEditTarget(), products = useProducts(), group = useScopeMembers();
  const pick = (v: string) => {
    if (!chooseEditTarget(v)) return;
    toast(v === 'all' ? 'Changing all products' : `Changing ${products.find((p) => p.id === v)?.name ?? v}`);
  };
  const inGroup = group ? products.filter((p) => group.ids.includes(p.id)) : [], others = products.filter((p) => !inGroup.includes(p));
  return (
    <label className="ac-prodsel ac-editsel" title="Where your changes go: all products (shared values) or one product">
      <span className="ac-prodsel-icon" aria-hidden="true">✏️</span>Change{' '}
      <select aria-label="Change" value={value} onChange={(e) => pick(e.target.value)}>
        <option value="all">All products</option>
        {group ? (
          <>
            <optgroup label={`${group.kind === 'wave' ? 'Wave' : 'Unit'}: ${group.label}`}>{inGroup.map(option)}</optgroup>
            {others.length > 0 && <optgroup label="Other products">{others.map(option)}</optgroup>}
          </>
        ) : products.map(option)}
      </select>
    </label>
  );
}
