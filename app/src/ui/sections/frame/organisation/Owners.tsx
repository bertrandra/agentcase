import { productsOfUnit, UNASSIGNED, unitTree, type OrgModel } from '@/domain/org';
import { OwnerSelect } from '@/ui/widgets/OwnerSelect';

/**
 * Which unit owns each product (docs/SPEC_BPMN.md § 21, F-B80, D-B39): one unit at any level of the tree, or "Unassigned". A product owned by a
 * department belongs to every unit above it: the count per unit includes its sub-units.
 */
export function Owners({ m }: { m: Pick<OrgModel, 'units' | 'products'> }) {
  const rolled = unitTree(m).map(({ unit, depth }) => ({ unit, depth, n: productsOfUnit(m.units, m.products, unit.id).length })).filter((r) => r.n > 0);
  const none = productsOfUnit(m.units, m.products, null).length;
  return (
    <section aria-labelledby="ac-org-owners-h">
      <h2 id="ac-org-owners-h">Owning unit of each product</h2>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>Products ({m.products.length}) and the unit that owns each</caption>
          <thead><tr><th scope="col">Product</th><th scope="col">Owning unit</th></tr></thead>
          <tbody>{m.products.map((p) => (
            <tr key={p.id}><th scope="row">{p.name}</th><td><OwnerSelect productId={p.id} name={p.name} owner={p.owner} units={m.units} /></td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="ac-muted">{[...rolled.map((r) => `${r.unit.name}: ${r.n}`), `${UNASSIGNED}: ${none}`].join(' · ')} (a unit counts the products of
        its sub-units)</p>
    </section>
  );
}
