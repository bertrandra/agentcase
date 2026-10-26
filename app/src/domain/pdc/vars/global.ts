/** @calc-zone workspace-config */
import { npvCanonical, paybackMonthsCanonical } from '../../canonical';
import { caseFte } from '../../economics/fte';
import { headline } from '../../economics/headline';
import { savingsBreakdown } from '../../economics/savings';
import { locationMix } from '../../location';
import { modelOf as model } from '../../tune/memo';
import { phaseScope } from '../../scope';
import { end, engineYear, sumSav, v } from './types';

/** The headline values every dashboard can bind (scope GLOBAL). */
export const GLOBAL_VARS = [
  v('netSavY1', 'Net savings Y1', 'EUR_K', '€', 'GLOBAL', (c) => engineYear(c, 1)?.savings ?? null),
  v('netSavY2', 'Net savings Y2', 'EUR_K', '€', 'GLOBAL', (c) => engineYear(c, 2)?.savings ?? null),
  v('netSavY3', 'Net savings, end-year', 'EUR_K', '€', 'GLOBAL', (c) => end(c).savings),
  v('cumSav3yr', 'Cumulative gain over horizon', 'EUR_K', '€', 'GLOBAL', sumSav),
  v('runCostY1', 'Run cost Y1', 'EUR_K', '€', 'GLOBAL', (c) => engineYear(c, 1)?.totalRunCost ?? null),
  v('runCostY3', 'Run cost, end-year', 'EUR_K', '€', 'GLOBAL', (c) => end(c).totalRunCost),
  v('grossAutoY3', 'Automation potential (gross auto value, end-year)', 'EUR_K', '€', 'GLOBAL',
    (c) => { const y = savingsBreakdown(c).years; return y[y.length - 1]!.grossAuto; }),
  v('paybackMonths', 'Payback', 'INT', 'months', 'GLOBAL', paybackMonthsCanonical),
  v('roiPct', 'ROI (net, over horizon)', 'PCT', '%', 'GLOBAL', (c) => (headline(c).roi ?? 0) * 100),
  v('npv8', 'NPV (case rate)', 'EUR_K', '€', 'GLOBAL', (c) => npvCanonical(c)),
  v('glassCeilingPct', 'Glass ceiling', 'PCT', '%', 'GLOBAL', (c) => model(c).ceiling),
  v('artefactsInScope', 'Artefacts in scope', 'INT', '', 'GLOBAL', (c) => phaseScope(c.a, c.s).count),
  v('adoptionRateY3', 'Adoption rate (end-year)', 'PCT', '%', 'GLOBAL', (c) => end(c).adoptionEndPct),
  v('sourcingMixIndia', 'Sourcing mix (India @ cruise)', 'PCT', '%', 'GLOBAL',
    (c) => c.s.targetLocPct?.India ?? (locationMix(c.s).pct as Record<string, number>).India ?? 0),
  v('fteShift', 'FTE peak → cruise', 'TEXT', '', 'GLOBAL', (c) => { const f = caseFte(c); return `${Math.round(f.before)} → ${Math.round(f.after)}`; }),
];
