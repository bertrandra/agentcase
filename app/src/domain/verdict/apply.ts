/** @calc-zone verdict */
import type { Ctx } from '../ctx';
import type { StratApplied, StrategyDef } from './defs';
import { SCALED_IDS, stratBaseValues, stratTargetLoc } from './evaluate';

export interface ApplyPatch {
  values: Record<string, string>;
  /** the strategy fixes the potential: fit-to-scope is switched off */
  fitAutoOff: boolean;
  /** a strategy ceiling makes the glass ceiling a forced input */
  forceCeiling: boolean;
  targetLocPct: Record<string, number> | null;
  applied: StratApplied;
}

/**
 * What "→ Apply" pushes into the live case (legacy applyStrategy): levers, setup/infra scaled from the strategy-neutral base
 * (so applying twice never compounds), run-team factor and the strategy's location split.
 */
export function strategyPatch(c: Ctx, S: StrategyDef): ApplyPatch {
  const L = S.levers || {}, values: Record<string, string> = {};
  const set = (id: string, v: number | null | undefined) => { if (v != null) values[id] = String(v); };
  set('autoPotential', L.auto); set('y1Ramp', L.y1); set('y2Ramp', L.y2); set('y3Ramp', L.y3);
  if (L.ceiling != null) set('glassCeiling', L.ceiling);
  const sF = L.setupF ?? 1, rF = L.runF ?? 1, base = stratBaseValues(c), written: Record<string, number> = {};
  SCALED_IDS.forEach((id) => {
    written[id] = Math.round((base[id] as number) * (id === 'infra' ? rF : sF));
    values[id] = String(written[id]);
  });
  set('runTeamFactor', rF);
  return { values, fitAutoOff: L.auto != null, forceCeiling: L.ceiling != null, targetLocPct: stratTargetLoc(c, S),
    applied: { id: S.id, base: { ...base }, written } };
}
