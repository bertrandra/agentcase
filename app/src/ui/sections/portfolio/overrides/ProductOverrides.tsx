import { applyOverrideToCommon, clearProductOverride } from '@/controllers/productOverrides';
import { commonValue, overrideRefs, overrideValue, type CommonCase, type Product } from '@/domain/portfolio';
import { toast } from '@/ui/uiState';
import { describeValue } from '@/ui/widgets/OverrideBadge';
import { overrideLabel } from './labels';

/** The overridden keys of one product against the common values, each with "Revenir au commun" and "Appliquer à tous les produits". */
export function ProductOverrides({ product, common, active }: { product: Product; common: CommonCase; active: boolean }) {
  const refs = overrideRefs(product.overrides);
  return (
    <section className="ac-panel" aria-labelledby={`ov-${product.id}`}>
      <header><h2 id={`ov-${product.id}`}>{product.name}{active ? ' (actif)' : ''}{product.archived ? ' (archivé)' : ''} — {refs.length ? `${refs.length} surcharge${refs.length > 1 ? 's' : ''}` : 'hérité'}</h2></header>
      {!refs.length ? <p className="ac-muted">Aucune surcharge : ce produit suit toutes les valeurs communes.</p> : (
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table">
            <caption className="ac-sr">Surcharges de {product.name}</caption>
            <thead><tr><th scope="col">Clé</th><th scope="col">Valeur commune</th><th scope="col">Valeur du produit</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {refs.map((ref) => {
                const label = overrideLabel(ref);
                return (
                  <tr key={ref}>
                    <th scope="row" title={ref}>{label}</th>
                    <td title={describeValue(commonValue(common, ref))}>{describeValue(commonValue(common, ref))}</td>
                    <td>{describeValue(overrideValue(product.overrides, ref))}</td>
                    <td>
                      <div className="ac-pf-actions" role="group" aria-label={`Actions : ${label}, ${product.name}`}>
                        <button type="button" aria-label={`Revenir au commun : ${label} (${product.name})`} onClick={() => { if (clearProductOverride(product.id, ref)) toast(`${label} : retour au commun pour ${product.name}`); }}>Revenir au commun</button>
                        <button type="button" aria-label={`Appliquer à tous les produits : ${label} (${product.name})`} onClick={() => { if (applyOverrideToCommon(product.id, ref)) toast(`${label} : appliqué à tous les produits`); }}>Appliquer à tous les produits</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
