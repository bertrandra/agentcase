import { setEditScope } from '@/controllers/product';
import { useEditScope, useIsMulti } from '@/store/portfolioHooks';
import { toast } from '../uiState';
import { ScopeSelect } from './ScopeSelect';

const SCOPES = [['all', 'Tous les produits'], ['product', 'Ce produit seulement']] as const;

/**
 * Multi-product controls of the top bar (spec F23: absent with a single product): the view (one selector for Portefeuille / Vague / Produit) and the edit scope.
 * Default scope is "Tous les produits": the entry team is always written to the active product (F2) whatever the scope, and the shared
 * data (scope, parameters) follows the common values while the product inherits them; "Ce produit seulement" creates overrides (spec 6.1).
 */
export function ProductBar() {
  const multi = useIsMulti(), scope = useEditScope();
  if (!multi) return null;
  const choose = (s: typeof SCOPES[number][0]) => { if (setEditScope(s)) toast(s === 'all' ? 'Modification : tous les produits' : 'Modification : ce produit seulement'); };
  return (
    <div className="ac-prodbar">
      <ScopeSelect />
      <div role="radiogroup" aria-label="Modifier" className="ac-editscope" title="Où vont vos modifications des données partagées (périmètre, paramètres). L’équipe est toujours celle du produit actif.">
        <span aria-hidden="true">Modifier :</span>
        {SCOPES.map(([v, l]) => (
          <label key={v}><input type="radio" name="ac-edit-scope" value={v} checked={scope === v} onChange={() => choose(v)} /> {l}</label>
        ))}
      </div>
    </div>
  );
}
