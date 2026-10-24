import { useIsMulti } from '@/store/portfolioHooks';
import { EditSelect } from './EditSelect';
import { ScopeSelect } from './ScopeSelect';

/**
 * Multi-product controls of the top bar (spec F23: absent with a single product): the View (one selector for Portfolio / Wave / Product) and the
 * "Edit:" dropdown (All products, or one product only). Default "All products": shared data (scope, parameters) goes to the common values — in a
 * Portfolio / Wave view always, in a Product view while the product inherits it — and the entry team is always the active product's (F2);
 * choosing a product creates overrides for it (spec 6.1).
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
