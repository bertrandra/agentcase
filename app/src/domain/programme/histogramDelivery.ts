/** @calc-zone delivery-views */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { fteBySkill } from '../location';

/**
 * The second view of the resource histogram (docs/SPEC_BPMN.md § 19.8 F-B76; phase B9d): the delivery process, FTE before and after agents per
 * role per month, READ from the Time Engine, never recomputed. Before = the entry team's FTE of the role (the capacity line). After = the
 * engine's human FTE of the month (`humanFte`), laid on the roles in the entry team's proportions (the engine sizes the team, not its roles: its
 * monthly figure is split, never re-derived, so the roles add up to it); the agentic run team (`runTeamFte`) and the agents' vFTE
 * (`agentVfte`) are the engine's rows. A month where a role needs more than its entry FTE is flagged (D-B37).
 */
export interface DeliveryRole { role: string; before: number; after: number[] }
export interface DeliveryHistogram {
  months: number; roles: DeliveryRole[];
  /** the engine's rows, per month (index t − 1) */
  humanFte: number[]; runTeam: number[]; agents: number[];
  flags: { role: string; month: number; fte: number; capacity: number }[];
}

export function deliveryHistogram(c: Ctx): DeliveryHistogram {
  const eng = engineNow(c), rows = eng.months(), skills = Object.entries(fteBySkill(c.s)), total = skills.reduce((s, [, f]) => s + f, 0);
  const humanFte = rows.map((r) => r.humanFte);
  const roles = skills.map(([role, before]) => ({ role, before, after: humanFte.map((h) => (total > 0 ? (h * before) / total : 0)) }));
  const flags = roles.flatMap((r) => r.after.flatMap((fte, i) => (fte > r.before + 1e-9 ? [{ role: r.role, month: i + 1, fte, capacity: r.before }] : [])));
  return { months: rows.length, roles, humanFte, runTeam: rows.map((r) => r.runTeamFte), agents: rows.map((r) => r.agentVfte), flags };
}
