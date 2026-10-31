import { useState } from 'react';
import type { Via } from '@/domain/org';
import type { ServiceView } from '@/domain/portfolio';
import { setActiveProduct } from '@/controllers/product';
import { useActiveProductId } from '@/store/portfolioHooks';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { fmtEur } from '@/ui/format';
import { fmtNum } from '@/ui/widgets/orgFormat';

const VIA: Record<Via, string> = { pin: 'pinned', type: 'activity type', role: 'Responsible role' };

/** What a service delivers to each product of the View: its activities (and why), their effort, the product's share, FTE and cost. */
export function Delivery({ v, ids }: { v: ServiceView; ids: readonly string[] }) {
  const [open, setOpen] = useState<string | null>(null), active = useActiveProductId();
  const rows = v.products.filter((p) => ids.includes(p.productId)), shown = rows.find((p) => p.productId === open);
  const go = (productId: string, id: string): void => { if (productId !== active) setActiveProduct(productId); openActivity(id); };
  return (
    <>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>{`What ${v.name} delivers to each product (effort: the engine's activity weight)`}</caption>
          <thead><tr><th scope="col">Product</th><th scope="col">Activities</th><th scope="col">Effort</th><th scope="col">Share of the effort</th>
            <th scope="col">FTE</th><th scope="col">Cost per year</th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.productId}>
              <th scope="row">{p.name}</th>
              <td><button type="button" className="ac-link" aria-expanded={open === p.productId}
                onClick={() => setOpen(open === p.productId ? null : p.productId)}>{`${p.activities.length} activities`}</button></td>
              <td className="ac-num">{fmtNum(p.effort)}</td>
              <td className="ac-num">{`${fmtNum(p.effortPct)} %`}</td>
              <td className="ac-num">{fmtNum(p.fte)}</td>
              <td className="ac-num">{fmtEur(p.cost)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {!rows.length && <p>No product of the View is served by this service.</p>}
      {shown && (
        <ul aria-label={`Activities ${v.name} does for ${shown.name}`}>
          {shown.activities.map((a) => (
            <li key={a.id}>{`${a.id} ${a.name} (${a.phase}) — effort ${fmtNum(a.effort)}, ${a.via.map((x) => VIA[x]).join(', ')} `}
              <button type="button" className="ac-link" onClick={() => go(shown.productId, a.id)}>{`Open ${a.id} in Process`}</button></li>
          ))}
          {!shown.activities.length && <li>No activity assigned: give the service an activity type, a role or pins.</li>}
        </ul>
      )}
    </>
  );
}
