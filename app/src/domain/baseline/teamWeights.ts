/** @calc-zone rate-card-team */
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import { SDLC_ARTEFACTS, REG_ARTEFACTS } from '../catalog';
import type { TeamRow } from '../types/state';
import { apportionFTE, snapFTE } from './apportion';
import { artTeamSkill, skillMapOf } from './skills';

export const isPinnedRow = (r: TeamRow | undefined): boolean => !!(r && r.pins && r.pins.length);
export const pinsOf = (r: TeamRow): string[] => (r.pins ?? []) as string[];

/** Pins must reference known artefacts and each artefact belongs to one row (first wins). */
export function normalisedPins(rows: TeamRow[]): string[][] {
  const known = new Set([...SDLC_ARTEFACTS, ...REG_ARTEFACTS].map((a) => a.id)), seen = new Set<string>();
  return rows.map((r) => pinsOf(r).filter((id) => known.has(id) && !seen.has(id) && (seen.add(id), true)));
}

/** artefact id → index of the row that pins it (first wins). */
export function pinIndex(rows: TeamRow[]): Record<string, number> {
  const m: Record<string, number> = {};
  rows.forEach((r, i) => pinsOf(r).forEach((id) => { if (m[id] == null) m[id] = i; }));
  return m;
}

export interface TeamWeights {
  rowW: number[]; totW: number; staffedW: number; poolBySkill: Record<string, number>; unassigned: Record<string, number>;
  unassignedW: number; impliedETP: number[]; targetFTE: number[]; totalFTE: number; fteToFullScope: number; pin: Record<string, number>;
}

/** How the scope weight spreads over the team rows: pinned artefacts go to their row, the rest to the auto rows of their skill (legacy teamWeights). */
export function teamWeights(c: Ctx): TeamWeights {
  const rows = c.s.teamIn, map = skillMapOf(c.s), act = activeArtefacts(c.a, c.s), pin = pinIndex(rows);
  const rowW = rows.map(() => 0), poolBySkill: Record<string, number> = {};
  let totW = 0;
  act.forEach((a) => {
    const w = +a.w || 0; totW += w;
    const i = pin[a.id];
    if (i != null && i < rows.length) { rowW[i]! += w; return; }
    const ts = artTeamSkill(a, map);
    poolBySkill[ts] = (poolBySkill[ts] || 0) + w;
  });
  const unassigned: Record<string, number> = {};
  Object.keys(poolBySkill).forEach((ts) => {
    const idx: number[] = [];
    rows.forEach((r, i) => { if (!isPinnedRow(r) && r.skill === ts) idx.push(i); });
    if (!idx.length) { unassigned[ts] = poolBySkill[ts]!; return; }
    const keyTot = idx.reduce((sum, i) => sum + Math.max(0, +rows[i]!.etp || 0), 0);
    idx.forEach((i) => { rowW[i]! += poolBySkill[ts]! * (keyTot > 0 ? Math.max(0, +rows[i]!.etp || 0) / keyTot : 1 / idx.length); });
  });
  const unassignedW = Object.values(unassigned).reduce((a, b) => a + b, 0);
  const totalFTE = rows.reduce((sum, r) => sum + (+r.etp || 0), 0), staffedW = rowW.reduce((a, b) => a + b, 0);
  return {
    rowW, totW, staffedW, poolBySkill, unassigned, unassignedW, pin, totalFTE,
    impliedETP: rowW.map((w) => (staffedW > 0 ? (totalFTE * w) / staffedW : 0)),
    targetFTE: apportionFTE(rowW, snapFTE(totalFTE)),
    fteToFullScope: staffedW > 0 ? (totalFTE * unassignedW) / staffedW : 0,
  };
}
