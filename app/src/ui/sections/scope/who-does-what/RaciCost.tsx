import { useId, useState } from 'react';
import { raciCostByUnit, type OrgModel } from '@/domain/org';
import { teamInCost } from '@/domain/location';
import { useCtxSelector, usePortfolio } from '@/store/hooks';
import { fmtEurK, fmtPct } from '@/ui/format';
import { fmtNum } from '@/ui/widgets/orgFormat';

/**
 * The RACI-driven load and cost by unit of the product shown (SPEC_FIXES FX-D7 (a), § 16.5), opt-in: ticked, the table splits the product's annual
 * team cost between the units by their share of the Responsible work. A view: no headline figure reads it (`raciCostByUnit`, domain/org).
 */
export function RaciCost({ m }: { m: OrgModel }) {
  const id = useId(), [on, setOn] = useState(false), productId = usePortfolio((p) => p.activeProductId);
  const cost = useCtxSelector((c) => teamInCost(c.s, c.inp).cost), x = on ? raciCostByUnit(m, productId, cost) : null;
  return (
    <section aria-labelledby={`${id}-h`} className="ac-org-raci-cost">
      <h2 id={`${id}-h`}>RACI-driven load and cost by unit</h2>
      <label><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Show the load and cost by unit (opt-in, a view: no
        figure of the case reads it)</label>
      {x && (x.rows.length ? <div className="ac-table-wrap" tabIndex={0}><table className="ac-table" aria-labelledby={`${id}-h`}>
        <thead><tr><th scope="col">Unit</th><th scope="col">Load (effort points)</th><th scope="col">Share</th><th scope="col">Cost a year</th></tr></thead>
        <tbody>{x.rows.map((r) => <tr key={r.unit.id}><th scope="row">{r.unit.name}</th><td className="ac-num">{fmtNum(r.load)}</td>
          <td className="ac-num">{fmtPct(r.share * 100)}</td><td className="ac-num">{fmtEurK(r.cost)}</td></tr>)}</tbody>
      </table></div> : <p className="ac-muted">No unit carries Responsible work for this product.</p>)}
    </section>
  );
}
