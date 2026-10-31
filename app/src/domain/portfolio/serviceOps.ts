/** @calc-zone product-resolution */
import { DEFAULT_UNIT_ID } from '../org/ids';
import { readStoredOrg } from '../org/readUnits';
import type { XDocument } from '../process/xml';
import { mapLine } from './sharedTeam';
import { lineShares } from './serviceShares';
import { sharedLines } from './teamAccess';
import type { Portfolio, SharedTeamLine } from './types';

/**
 * Operations on the service of a shared line (F-B82, phase B10c), each a node patch of the line's team element (`unit`, `split`, its shares):
 * - `setLineUnit` moves a line to a unit (null: back to the default delivery unit). A line that joins a shared service without any share is split by
 *   effort; a line holding shares keeps them as its fixed override (the migration rule: its figures do not move). Leaving a service drops the rule.
 * - `setLineSplit` chooses the rule of a service line: by effort (D-B38 a), or fixed shares (the override, b); fixing a line that holds no share
 *   seeds its shares with the effort split as it stands (rounded to 0.01 %), so the switch moves no figure but that rounding.
 * Refused (same portfolio): an unknown line or unit, `effort` outside a service.
 */
const serviceIds = (pf: Portfolio): Set<string> => {
  const d = pf.common.BPMN as XDocument | undefined;
  return new Set((d?.root ? readStoredOrg(d).units : []).filter((u) => u.service).map((u) => u.id));
};
const unitIds = (pf: Portfolio): Set<string> => {
  const d = pf.common.BPMN as XDocument | undefined;
  return new Set([DEFAULT_UNIT_ID, ...(d?.root ? readStoredOrg(d).units : []).map((u) => u.id)]);
};
const has = (o: Record<string, number>): boolean => Object.values(o).some((x) => x > 0);

function withUnit(l: SharedTeamLine, unit: string | null, service: boolean): SharedTeamLine {
  const { unit: _u, split: _s, ...rest } = l;
  void _u; void _s;
  const out: SharedTeamLine = unit && unit !== DEFAULT_UNIT_ID ? { ...rest, unit } : { ...rest };
  if (service && (l.split === 'effort' || !has(l.allocations))) out.split = 'effort';
  return out;
}

export function setLineUnit<T extends Portfolio>(pf: T, id: string, unit: string | null): T {
  if (unit !== null && !unitIds(pf).has(unit)) return pf;
  const service = unit !== null && serviceIds(pf).has(unit);
  return mapLine(pf, id, (l) => withUnit(l, unit, service));
}

export function setLineSplit<T extends Portfolio>(pf: T, id: string, split: 'effort' | 'fixed'): T {
  const l = sharedLines(pf).find((x) => x.id === id);
  if (!l || (split === 'effort' ? l.split === 'effort' : l.split !== 'effort')) return pf;
  if (split === 'effort') return serviceIds(pf).has(l.unit ?? DEFAULT_UNIT_ID) ? mapLine(pf, id, (x) => ({ ...x, split: 'effort' })) : pf;
  const seed = has(l.allocations) ? l.allocations
    : Object.fromEntries(Object.entries(lineShares(pf, l)).map(([p, v]) => [p, Math.round(v * 100) / 100]).filter(([, v]) => (v as number) > 0));
  return mapLine(pf, id, (x) => { const { split: _s, ...rest } = x; void _s; return { ...rest, allocations: seed }; });
}
