/** @calc-zone run-setup-taxes @owner run-team */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';

export interface RunSizingView { av: number[]; rt: number[]; rc: number[]; perFte: (number | null)[]; eff: number }
/** Agentic run team per horizon year (legacy renderRunSizing): agent vFTE, run FTE, run cost, agents per run FTE. */
export function runSizingView(c: Ctx): RunSizingView {
  const Y = engineNow(c).years(), av = Y.map((y) => y.agentVfteEnd), rt = Y.map((y) => y.runTeamFteEnd);
  return { av, rt, rc: Y.map((y) => y.runTeamCost), perFte: rt.map((v, i) => (v > 0 ? (av[i] as number) / v : null)), eff: model(c).eff };
}

export interface SupervisionSplit { devETP: number; supETP: number; residualETP: number; supShare: number; avgHumanSup: number; endLabel: string }
/** Residual project team split into delivery vs. supervision FTE (legacy targetTeam()). */
export function supervisionSplit(c: Ctx): SupervisionSplit {
  const e = engineNow(c), residualETP = e.year(e.horizonYears).humanFteEnd;
  const act = activeArtefacts(c.a, c.s);
  const avgHumanSup = act.length ? act.reduce((s, a) => s + a.humanSup, 0) / act.length / 100 : 0.4;
  const supShare = Math.min(c.s.COEF.supShareCap as number, avgHumanSup * (c.s.COEF.supShareFactor as number));
  const supETP = residualETP * supShare;
  return { devETP: residualETP - supETP, supETP, residualETP, supShare, avgHumanSup, endLabel: `Y${e.horizonYears}` };
}
