/** @calc-zone verification */
import type { Ctx } from '../ctx';
import { modelRaw } from '../model/raw';
import { timeFor } from '../time';
import { yearOf } from '../time/adapters';
import { aAt, buildK, type K } from '../time/kernel';

const TOL = 1e-6;
/** Legacy-mode Time Engine (mode 'legacy', curve legacy.flatAnnual): the annual model disaggregated /12, month by month (legacy deriveLegacyAt). */
export function legacyMonth(t: number, K: K) {
  const y = yearOf(t, K), A = K.A, team = aAt(A.yearTeamCost, y) / 12, token = aAt(A.yearToken, y) / 12;
  const run = team + token + aAt(A.yearInfraEff, y) / 12 + aAt(A.yearRunAgenticCost, y) / 12 + aAt(A.khRunYr, y) / 12;
  const gross = A.baselineRun / 12 - run + aAt(A.ktAvoidYr, y) / 12 - aAt(A.vTaxYr, y) / 12 - aAt(A.loopExtYr, y) / 12 + (K.savingProfile[t - 1] ?? 0);
  const setup = K.setupProfile[t - 1] ?? 0;
  return { team, token, run, gross, net: gross - setup, human: aAt(A.yearETP, y), agent: aAt(A.yearAgentVfte, y), ramp: K.ramps[y] as number };
}
export const legacyK = (c: Ctx) => buildK(c, modelRaw(c), { mode: 'legacy', curveModelId: 'legacy.flatAnnual' });

/**
 * TE-10b (Time Engine spec v5 §17): the full kernel at a flat ramp reproduces the legacy flat mode month by month (gross savings, run cost) to float
 * tolerance; skipped under a supervision cap or a velocity tax (the legacy mode does not model them). One function for the verification section and
 * the live logic checks (SPEC_FIXES FX-60, owner's decision 2026-11-02: wired into the engine's checks, `vars/auditModel.ts`).
 */
export function te10b(c: Ctx): string | null {
  try {
    const m = modelRaw(c);
    if (m.sup.constrained || m.conv.vTaxRate > 0) return null;
    const K = legacyK(c), full = timeFor(c, { mode: 'full', curveModelId: 'legacy.flatAnnual', model: m });
    for (let t = 1; t <= m.horizon * 12; t++) {
      const a = legacyMonth(t, K), b = full.monthAt(t);
      if (Math.abs(a.gross - b.grossSavings) > TOL) return `month ${t}: full.grossSavings ${b.grossSavings.toFixed(4)} != legacy ${a.gross.toFixed(4)}`;
      if (Math.abs(a.run - b.totalRunCost) > TOL) return `month ${t}: full.totalRunCost ${b.totalRunCost.toFixed(4)} != legacy ${a.run.toFixed(4)}`;
    }
    return null;
  } catch (e) { return `TE-10b threw: ${e instanceof Error ? e.message : String(e)}`; }
}

