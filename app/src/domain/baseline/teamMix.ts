/** @calc-zone rate-card-team */
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import type { TeamRow } from '../types/state';
import { FTE_STEP, apportionFTE, snapFTE } from './apportion';
import { artTeamSkill, defaultGradeLoc, skillMapOf } from './skills';
import { isPinnedRow, pinIndex, teamWeights } from './teamWeights';

const withRows = (c: Ctx, rows: TeamRow[]): Ctx => ({ ...c, s: { ...c.s, teamIn: rows } });

/**
 * Rebuild the auto rows from the artefact skill mix, keep pinned rows; the (snapped) total is apportioned over every row's weight (legacy
 * buildTeamFromArtefacts).
 */
export function buildTeamRows(c: Ctx): TeamRow[] {
  const rows = c.s.teamIn, W = teamWeights(c), map = skillMapOf(c.s);
  const totalFTE = W.totalFTE > 0 ? W.totalFTE : 15;
  const gl: Record<string, [string, string, number]> = {};
  rows.forEach((r) => { if (isPinnedRow(r)) return; const cur = gl[r.skill]; if (!cur || (+r.etp || 0) > cur[2]) gl[r.skill] = [r.grade, r.loc, +r.etp || 0]; });
  const kept: TeamRow[] = [], keptW: number[] = [];
  rows.forEach((r, i) => { if (isPinnedRow(r)) { kept.push({ ...r }); keptW.push(W.rowW[i]!); } });
  const pin = pinIndex(rows), pool: Record<string, number> = {};
  activeArtefacts(c.a, c.s).forEach((a) => { if (pin[a.id] != null) return; const ts = artTeamSkill(a, map); pool[ts] = (pool[ts] || 0) + (+a.w || 0); });
  const skills = Object.keys(pool).sort();
  const autos: TeamRow[] = skills.map((ts) => { const d = gl[ts] ?? defaultGradeLoc(ts); return { skill: ts, grade: d[0], loc: d[1], etp: 0, pins: [] }; });
  const out = kept.concat(autos);
  const shares = apportionFTE(keptW.concat(skills.map((ts) => pool[ts]!)), snapFTE(totalFTE) || FTE_STEP);
  return out.map((r, i) => ({ ...r, etp: shares[i]! }));
}

/** Set every row's FTE to its artefact-implied value (0.5 steps, total preserved), iterated to a fixed point. Null when nothing can be aligned. */
export function alignTeamRows(c: Ctx): TeamRow[] | null {
  let rows = c.s.teamIn;
  if (!(teamWeights(c).totW > 0) || !rows.length) return null;
  const target = snapFTE(rows.reduce((s, r) => s + (+r.etp || 0), 0));
  if (!(target > 0)) return null;
  for (let it = 0; it < 8; it++) {
    const next = apportionFTE(teamWeights(withRows(c, rows)).rowW, target);
    const stable = rows.every((r, i) => Math.abs((+r.etp || 0) - next[i]!) <= 1e-9);
    rows = rows.map((r, i) => ({ ...r, etp: next[i]! }));
    if (stable) break;
  }
  return rows;
}

/** Scale every row pro-rata so the total becomes `val` (snapped to 0.5); null when the request cannot apply. */
export function scaleRows(rows: TeamRow[], val: unknown): TeamRow[] | null {
  const target = snapFTE(val), cur = rows.reduce((s, r) => s + (+r.etp || 0), 0);
  if (!(target > 0) || !rows.length) return null;
  const shares = apportionFTE(cur > 0 ? rows.map((r) => +r.etp || 0) : rows.map(() => 1), target);
  return rows.map((r, i) => ({ ...r, etp: shares[i]! }));
}
