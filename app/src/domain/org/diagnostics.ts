/** @calc-zone process-model */
import { teamRowsOf } from './teams';
import type { ActivityRaci, OrgDiagnostic, OrgModel, OrgRole } from './types';

/**
 * The organisation diagnostics (§ 16.2): F-B36 on the RACI of each in-scope activity, F-B37 on the staffing of each product, plus the
 * over-allocation of a shared team (lot 7 rule). Never silent: every finding is listed with its activity / product. D-B18: a missing human
 * Accountable on an agent-performed activity is information, not an error.
 */
const actorsOf = (a: ActivityRaci): string[] => [...a.raci.R, ...(a.raci.A ? [a.raci.A] : []), ...a.raci.C, ...a.raci.I];

/** F-B36 for one activity. */
export function raciDiagnostics(a: ActivityRaci, known: ReadonlySet<string>): OrgDiagnostic[] {
  const out: OrgDiagnostic[] = [], at = { activity: a.id };
  const who = `${a.id} ${a.name}`;
  if (!a.raci.R.length && !a.agent) out.push({ code: 'noResponsible', severity: 'error', message: `${who}: no Responsible role or agent`, ...at });
  if (a.accountables > 1) {
    out.push({ code: 'severalAccountable', severity: 'error', message: `${who}: ${a.accountables} Accountable roles (at most one)`, ...at });
  }
  if (!a.raci.A) {
    out.push(a.agent ? { code: 'noHumanAccountable', severity: 'info', message: `${who}: agent-performed, no human Accountable`, ...at }
      : { code: 'noAccountable', severity: 'warning', message: `${who}: no Accountable role`, ...at });
  } else if (a.accountableToConfirm) {
    out.push({ code: 'accountableToConfirm', severity: 'info', message: `${who}: Accountable taken from the role, to confirm`, ...at });
  }
  for (const id of new Set(actorsOf(a))) {
    if (!known.has(id)) out.push({ code: 'unknownActor', severity: 'warning', message: `${who}: unknown role ${id}`, ...at, ref: id });
  }
  return out;
}

/** The team skills a product's teams provide (lines with FTE > 0). */
export const skillsOf = (m: OrgModel, productId: string): Set<string> =>
  new Set(teamRowsOf(m.teams, productId).filter((r) => (+r.etp || 0) > 0).map((r) => r.skill));

/** F-B37: the in-scope activities of a product whose Responsible role is provided by no team serving it, per role. */
export function unstaffed(m: OrgModel, productId: string): Map<OrgRole, ActivityRaci[]> {
  const skills = skillsOf(m, productId), byId = new Map(m.roles.map((r) => [r.id, r])), out = new Map<OrgRole, ActivityRaci[]>();
  for (const a of m.activities) {
    if (!a.inScope) continue;
    for (const id of a.raci.R) {
      const r = byId.get(id);
      if (!r || r.kind !== 'role' || r.teamSkill === undefined || skills.has(r.teamSkill)) continue;
      out.set(r, [...(out.get(r) ?? []), a]);
    }
  }
  return out;
}

/** Every diagnostic of the model: F-B36 per in-scope activity, F-B37 per product and role, over-allocated shared teams. */
export function orgDiagnostics(m: OrgModel): OrgDiagnostic[] {
  const known = new Set(m.roles.map((r) => r.id)), out = m.activities.filter((a) => a.inScope).flatMap((a) => raciDiagnostics(a, known));
  for (const p of m.products) {
    for (const [r, acts] of unstaffed(m, p.id)) {
      const n = `${acts.length} activit${acts.length > 1 ? 'ies' : 'y'}`;
      out.push({ code: 'roleNotStaffed', severity: 'warning', productId: p.id, ref: r.id,
        message: `${p.name}: role ${r.name} (${r.teamSkill}) is Responsible for ${n}, no team serving the product provides it` });
    }
  }
  for (const t of m.teams) {
    const total = t.serves.reduce((s, x) => s + x.pct, 0);
    if (t.shared && total > 100 + 1e-9) {
      out.push({ code: 'overAllocated', severity: 'warning', ref: t.id, message: `${t.name}: allocated ${total} % (over 100 %)` });
    }
  }
  return out;
}

export const countBySeverity = (ds: readonly OrgDiagnostic[]): Record<'error' | 'warning' | 'info', number> => ({
  error: ds.filter((d) => d.severity === 'error').length, warning: ds.filter((d) => d.severity === 'warning').length,
  info: ds.filter((d) => d.severity === 'info').length,
});
