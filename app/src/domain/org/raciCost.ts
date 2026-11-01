/** @calc-zone process-model */
import type { OrgModel, OrgUnit } from './types';
import { teamWork } from './views';

/**
 * The RACI-driven load and cost by organisation unit for one product (SPEC_FIXES FX-D7 (a), § 16.5; opt-in, a view: no headline figure reads it).
 * The load of a team for the product is the effort of the in-scope activities it is Responsible for — the activity's own team split (FX-22) when
 * it has one, else each Responsible role's share split between the teams providing its skill by their FTE for the product. A unit carries the load
 * of its teams; the product's annual team cost (`cost`, its entry team at its rates: `teamInCost`) is allocated to the units by their share of the
 * load. The one owner of these figures: SPEC_HARNESS's cells (activity × team) start from it.
 */
export interface UnitCost { unit: OrgUnit; load: number; share: number; cost: number }
export interface RaciCost { rows: UnitCost[]; load: number; cost: number }

export function raciCostByUnit(m: OrgModel, productId: string, cost: number): RaciCost {
  const per = new Map<string, number>();
  for (const t of m.teams) {
    if (!t.serves.some((s) => s.productId === productId && s.pct > 0)) continue;
    const l = teamWork(m, t, productId).load;
    if (l > 0) per.set(t.unit, (per.get(t.unit) ?? 0) + l);
  }
  const load = [...per.values()].reduce((s, x) => s + x, 0);
  const rows = [...per].map(([id, l]): UnitCost => {
    const unit = m.units.find((u) => u.id === id) ?? { id, name: id, type: 'other' as const }, share = load > 0 ? l / load : 0;
    return { unit, load: l, share, cost: cost * share };
  }).sort((x, y) => y.load - x.load || x.unit.name.localeCompare(y.unit.name));
  return { rows, load, cost: load > 0 ? cost : 0 };
}
