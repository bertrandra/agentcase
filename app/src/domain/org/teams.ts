/** @calc-zone process-model */
import { memoChain } from '../portfolio/memo';
import type { Portfolio, SharedTeamLine } from '../portfolio/types';
import type { TeamRow } from '../types/state';
import { DEFAULT_UNIT_ID, productTeamId, sharedTeamId } from './ids';
import { attr, type XDocument } from '../process/xml';
import { sharedLineIn, storedTeams, teamRowsIn } from './teamDoc';
import type { OrgTeam, OrgUnit, Serving } from './types';

/**
 * The teams of the organisation (§ 16.3), read from the organisation part of the common document since schema v5 (phase B10a; B6b derived them
 * from the `teamIn` / `sharedTeam` keys, with the same result):
 * - each product's entry team is the team "‹product› delivery team" (of the default unit "‹customer› delivery" unless moved), serving it at 100 %;
 * - each shared team line is a shared team of one line, serving its products with their shares.
 * `teamRowsOf` rebuilds a product's effective team from these teams: the same rows, values and order as `effectiveTeam` (tested on every fixture).
 */
export { DEFAULT_UNIT_ID, productTeamId, sharedTeamId };

/** The default delivery unit (derived while the document does not hold a unit of that id). */
export function defaultUnit(customer: string): OrgUnit {
  return { ...defaultUnitInput(customer), derived: true };
}
/** The default delivery unit as written into the document. */
export function defaultUnitInput(customer: string): Omit<OrgUnit, 'derived'> {
  const name = customer.trim() ? `${customer.trim()} delivery` : 'Delivery';
  return { id: DEFAULT_UNIT_ID, name, type: 'department', sourcing: 'internal' };
}

const shares = (alloc: Record<string, number>): Serving[] =>
  Object.entries(alloc).filter(([, pct]) => typeof pct === 'number' && pct > 0).map(([productId, pct]) => ({ productId, pct }));

const roots = new WeakMap<object, unknown>();
const sharedTeamOf = (l: SharedTeamLine, unit: string): OrgTeam => ({ id: sharedTeamId(l.id), name: `Shared ${l.skill} · ${l.grade} · ${l.loc}`, unit,
  lines: [{ skill: l.skill, grade: l.grade, loc: l.loc, etp: l.etp, pins: l.pins ?? [] }], serves: shares(l.allocations), shared: true, sourceLine: l.id });
/** The teams of a portfolio (a single case is a portfolio of one product, D-B17), read from its common document. Memoised on the products and teams. */
export function derivedTeams(pf: Pick<Portfolio, 'products' | 'common'>): OrgTeam[] {
  const st = storedTeams(pf.common.BPMN as XDocument | undefined);
  return memoChain(roots, [pf.products, st], 'teams', () => [
    ...pf.products.map((p): OrgTeam => {
      const e = st.own.get(p.id);
      return { id: productTeamId(p.id), name: `${p.name} delivery team`, unit: (e && attr(e, 'unit')) || DEFAULT_UNIT_ID, lines: e ? teamRowsIn(e) : [],
        serves: [{ productId: p.id, pct: 100 }], shared: false };
    }),
    ...st.shared.map((e) => sharedTeamOf(sharedLineIn(e), attr(e, 'unit') || DEFAULT_UNIT_ID)),
  ]);
}

/** The share (percent) a team gives a product, 0 when it does not serve it. */
export const servingPct = (t: OrgTeam, productId: string): number => t.serves.find((s) => s.productId === productId)?.pct ?? 0;

/**
 * A product's effective entry team rebuilt from the teams: its own team's rows, then one row per shared team that serves it (FTE x share, marked
 * `shared` with the line id, carrying the line's pins). Without a share it is the own team's rows themselves (same identity), like `effectiveTeam`.
 */
export function teamRowsOf(teams: readonly OrgTeam[], productId: string): TeamRow[] {
  const own = teams.find((t) => !t.shared && !t.imported && t.id === productTeamId(productId))?.lines ?? [];
  const fte = (t: OrgTeam): number => ((+(t.lines[0]?.etp ?? 0) || 0) * servingPct(t, productId)) / 100;
  const sharing = teams.filter((t) => t.shared && fte(t) > 0);
  if (!sharing.length) return own;
  return [...own, ...sharing.map((t): TeamRow => {
    const l = t.lines[0]!;
    return { skill: l.skill, grade: l.grade, loc: l.loc, etp: fte(t), pins: l.pins ?? [], shared: t.sourceLine };
  })];
}

/** The teams that serve a product (own team first), with their share. */
export const teamsServing = (teams: readonly OrgTeam[], productId: string): { team: OrgTeam; pct: number }[] =>
  teams.map((team) => ({ team, pct: servingPct(team, productId) })).filter((x) => x.pct > 0);
