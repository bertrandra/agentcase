/** @calc-zone rate-card-team */
import type { Ctx } from '../ctx';
import { activeArtefacts } from '../scope';
import { SDLC_ARTEFACTS, REG_ARTEFACTS } from '../catalog';
import { readProcess, type XDocument } from '../process';
import type { TeamRow } from '../types/state';
import { apportionFTE, snapFTE } from './apportion';
import { artTeamSkill, skillMapOf } from './skills';

export const isPinnedRow = (r: TeamRow | undefined): boolean => !!(r && r.pins && r.pins.length);
export const pinsOf = (r: TeamRow): string[] => (r.pins ?? []) as string[];

/**
 * What a team line may pin (SPEC_FIXES FX-03): the activities of the case's own process — custom activities included — and the catalogue's
 * artefacts. The one rule the imports (parameters workbook, portfolio workbook) check pins against.
 */
export function pinTargets(...docs: XDocument[]): Set<string> {
  const out = new Set([...SDLC_ARTEFACTS, ...REG_ARTEFACTS].map((a) => a.id));
  for (const d of docs) for (const a of readProcess(d).activities) out.add(a.id);
  return out;
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

export interface TeamCoverage {
  /** share of the scope weight staffed (%), the unstaffed rest, and whether any is unstaffed */
  coveredPct: number; unstaffedPct: number; unstaffed: boolean;
  /** the unstaffed skills: their share of the scope weight (%) and how many of their lines are pinned elsewhere */
  bySkill: { skill: string; pct: number; pinnedLines: number }[];
  /** share of the scope weight on pinned lines (%), the auto pool, and whether pinning is visible (above 0.05 %) */
  pinnedPct: number; autoPct: number; pinned: boolean;
  /** each row's share of the scope weight (%) and its FTE minus the FTE the artefact mix implies */
  rowSharePct: number[]; rowDelta: number[];
}

/** A line's FTE minus the FTE its artefact mix implies (the "implied FTE" column), and its sign (|Δ| < 1e-9 reads as zero). */
export const fteDelta = (r: TeamRow, W: TeamWeights, i: number): number => (+r.etp || 0) - (W.targetFTE[i] ?? 0);
export const deltaSign = (d: number): 'zero' | 'over' | 'under' => (Math.abs(d) < 1e-9 ? 'zero' : d > 0 ? 'over' : 'under');

/** How far the team covers the scope weight (the Team-in banner, the pin editor and the implied-FTE column read it). */
export function teamCoverage(rows: TeamRow[], W: TeamWeights): TeamCoverage {
  const pct = (w: number) => (W.totW ? (w / W.totW) * 100 : 0), coveredPct = W.totW ? (1 - W.unassignedW / W.totW) * 100 : 100;
  const pinnedPct = pct(rows.reduce((s, r, i) => s + (isPinnedRow(r) ? W.rowW[i]! : 0), 0));
  return {
    coveredPct, unstaffedPct: 100 - coveredPct, unstaffed: W.unassignedW > 1e-9,
    bySkill: Object.keys(W.unassigned).sort().map((skill) => ({ skill, pct: pct(W.unassigned[skill]!),
      pinnedLines: rows.filter((r) => r.skill === skill && isPinnedRow(r)).length })),
    pinnedPct, autoPct: 100 - pinnedPct, pinned: pinnedPct > 0.05,
    rowSharePct: rows.map((_, i) => pct(W.rowW[i] ?? 0)), rowDelta: rows.map((r, i) => fteDelta(r, W, i)),
  };
}
