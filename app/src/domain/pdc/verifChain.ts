import type { Ctx } from '../ctx';
import { headline } from '../economics/headline';
import { fmtRoiPct } from '../economics/roi';
import { model } from '../model/overlay';
import { fmtE, fmtK } from './verifFormat';

/** The calculation chain with the live value at each stage: [step, formula, calculation, result]. */
export function calcChain(c: Ctx): string[][] {
  const m = model(c), d = m.yearETP, rn = Math.round;
  return [
    ['Input team', 'Σ fte', '—', `${m.base.etp.toFixed(1)} FTE`],
    ['AS-IS cost', 'Σ fte×rate×days', '—', `${fmtK(m.base.cost)}/yr`],
    ['Blended day-rate AS-IS', 'cost/(fte×days)', `€${rn(m.blendedTJM)}`, `€${rn(m.blendedTJM)}`],
    ['Blended day-rate target', 'Σ %target×rate_loc', 'loc. strategy', `€${rn(m.tgtTJM)}`],
    ['Scope weight', 'selected art./total', `${m.scope.count}/${m.scope.totalArt}`, `${rn(m.scope.weight * 100)}%`],
    ['Effective auto', 'auto×(1−ceiling)', `${m.auto}%×(1−${m.ceiling}%)`, `${m.eff.toFixed(1)}%`],
    ['Delivery FTE Y3 (excl. AgentOps)', 'etp×(1−ramp×eff)', `${m.base.etp.toFixed(1)}×(1−${m.ramps[2]}%×${m.eff.toFixed(0)}%)`, `${d[2]!.toFixed(1)} FTE`],
    ['Agent vFTE Y3', 'fte×ramp×eff (replaced effort)', '—', `${m.yearAgentVfte[2]!.toFixed(1)} FTE`],
    ['Agent capacity Y3', `vFTE×${m.PROD_FACTOR} (indicative)`, '—', m.yearAgentCapacity[2]!.toFixed(1)],
    ['Team cost Y3', 'FTE_Y3×rate_target×days', '—', fmtK(m.yearTeamCost[2]!)],
    ['Tokens Y3', 'art/mo×tokens×€/1M×12', '—', `${fmtE(m.yearToken[2]!)}/yr`],
    ['Agentic run', 'FTE_AI×day rate×1.15×days', `${m.runAgenticETP.toFixed(1)} FTE`, fmtK(m.runAgenticCost)],
    ['Total run Y3', 'team+tokens+infra+runAI', '—', fmtK(m.yearRun[2]!)],
    ['Benefit Y3', 'baseline−run+KT−tax−ext', '—', fmtK(m.yearSav[2]!)],
    ['ROI 3 years (net)', '(Σ benefits − Setup)/Setup', '—', fmtRoiPct(headline(c).roi)],
  ];
}
