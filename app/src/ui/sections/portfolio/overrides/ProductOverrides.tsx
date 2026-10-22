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
      <header><h2 id={`ov-${product.id}`}>{product.name}{active ? ' (active)' : ''}{product.archived ? ' (archived)' : ''} — {refs.length ? `${refs.length} override${refs.length > 1 ? 's' : ''}` : 'inherited'}</h2></header>
      {!refs.length ? <p className="ac-muted">No override: this product follows all the common values.</p> : (
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table">
            <caption className="ac-sr">Overrides of {product.name}</caption>
            <thead><tr><th scope="col">Key</th><th scope="col">Common value</th><th scope="col">Product value</th><th scope="col">Actions</th></tr></thead>
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
                        <button type="button" aria-label={`Revert to common: ${label} (${product.name})`} onClick={() => { if (clearProductOverride(product.id, ref)) toast(`${label}: reverted to common for ${product.name}`); }}>Revert to common</button>
                        <button type="button" aria-label={`Apply to all products: ${label} (${product.name})`} onClick={() => { if (applyOverrideToCommon(product.id, ref)) toast(`${label}: applied to all products`); }}>Apply to all products</button>
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
