import { setEditScope } from '@/controllers/product';
import { useEditScope, useIsMulti } from '@/store/portfolioHooks';
import { toast } from '../uiState';
import { ScopeSelect } from './ScopeSelect';

const SCOPES = [['all', 'All products'], ['product', 'This product only']] as const;

/**
 * Multi-product controls of the top bar (spec F23: absent with a single product): the view (one selector for Portfolio / Wave / Product) and the edit scope.
 * Default scope is "All products": the entry team is always written to the active product (F2) whatever the scope, and the shared
 * data (scope, parameters) follows the common values while the product inherits them; "This product only" creates overrides (spec 6.1).
 */
export function ProductBar() {
  const multi = useIsMulti(), scope = useEditScope();
  if (!multi) return null;
  const choose = (s: typeof SCOPES[number][0]) => { if (setEditScope(s)) toast(s === 'all' ? 'Edit: all products' : 'Edit: this product only'); };
  return (
    <div className="ac-prodbar">
      <ScopeSelect />
      <div role="radiogroup" aria-label="Edit" className="ac-editscope" title="Where your changes to shared data (scope, parameters) go. The team is always the active product’s.">
        <span aria-hidden="true">Edit:</span>
        {SCOPES.map(([v, l]) => (
          <label key={v}><input type="radio" name="ac-edit-scope" value={v} checked={scope === v} onChange={() => choose(v)} /> {l}</label>
        ))}
      </div>
    </div>
  );
}
