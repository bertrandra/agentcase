import { useServices } from '@/store/serviceHooks';
import type { OrgParts } from '../Units';
import { Cost } from './Cost';
import { Delivery } from './Delivery';
import { Load } from './Load';
import { Settings } from './Settings';

/**
 * The Services tab of 🏢 Organisation (docs/SPEC_BPMN.md § 21 F-B82, phase B10c): per shared service, its settings (activity types, roles, lines
 * and their split rule), what it delivers to each product of the View, its load against its capacity month by month and its cost by product.
 * The figures are read from the domain (`servicesView`, `serviceLoad`); nothing is computed here.
 */
export function Services({ m }: { m: OrgParts }) {
  const { views, scope } = useServices(), units = m.units.filter((u) => u.service);
  if (!units.length) {
    return (
      <section aria-labelledby="ac-svc-h">
        <h2 id="ac-svc-h">Shared services</h2>
        <p>No shared service yet. Tick <strong>Service</strong> on a unit in the Organisation tab: its shared team lines will serve the products
          by the effort of the activities it does for each.</p>
      </section>
    );
  }
  return (
    <>
      <p className="ac-muted" aria-live="polite">{`Showing ${scope.kind === 'portfolio' ? 'the portfolio' : `${scope.kind} ${scope.label}`}: `
        + `${scope.productIds.length} product${scope.productIds.length === 1 ? '' : 's'}.`}</p>
      {units.map((u) => {
        const v = views.find((x) => x.id === u.id);
        return (
          <section key={u.id} aria-labelledby={`ac-svc-${u.id}-h`} className="ac-svc">
            <h2 id={`ac-svc-${u.id}-h`}>{`Service ${u.name}`}</h2>
            {v && <>
              <Settings unit={u} v={v} roles={m.roles} />
              <Delivery v={v} ids={scope.productIds} /><Load v={v} scope={scope} /><Cost v={v} ids={scope.productIds} />
            </>}
          </section>
        );
      })}
    </>
  );
}
