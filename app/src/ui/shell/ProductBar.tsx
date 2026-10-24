import { useIsMulti } from '@/store/portfolioHooks';
import { EditSelect } from './EditSelect';
import { ScopeSelect } from './ScopeSelect';

/**
 * Multi-product controls of the top bar (spec F23: absent with a single product): "👁 Show" (one selector for Portfolio / Wave / Product) and
 * "✏️ Change" (All products, or one product). Default "All products": shared data (scope, parameters) goes to the common values — in a
 * Portfolio / Wave view always, in a Product view while the product inherits it — and the entry team is always the active product's (F2);
 * choosing a product creates overrides for it (spec 6.1). "Change follows Show" (F17 revised): see `controllers/displayScope.ts`.
 */
export function ProductBar() {
  const multi = useIsMulti();
  if (!multi) return null;
  return (
    <div className="ac-prodbar">
      <ScopeSelect />
      <EditSelect />
    </div>
  );
}
