/** @calc-zone exports */
import { khRunAnnual } from '../knowledge';
import { model } from '../model/overlay';
import { pilotMonths, pilotSizing } from '../tune/program';
import { lay, layWide } from './costModelAxis';
import { row } from './costModelRow';
import type { CostRow } from './costModelTypes';
import type { ProductView } from './waves';

export const COST = 'cost (+)', SAVE = 'saving (-)';

/** The pilot's monthly spend on the calendar (decision D4): from the product's month 1 (`pilotMonths`), empty outside the pilot months. */
export function pilotCells(v: ProductView, L: number): (number | null)[] {
  const pm = pilotMonths(pilotSizing(v.run.ctx));
  return lay(v, L, (t) => pm[t - 1] ?? 0).map((x, i) => (x !== null && i - v.month0 < pm.length ? x : null));
}
/** a + b month by month; an empty b leaves a as it is. */
export const plus = (a: (number | null)[], b: (number | null)[]): (number | null)[] => a.map((x, i) => (b[i] == null ? x : (x ?? 0) + (b[i] as number)));
export type Keys = (group: string, line: string, basis: string, sign: string) => string[];

/**
 * The cost lines of a product other than its team, month by month, from its Time Engine rows and its calendar series (no financial formula of its own).
 * Costs are positive and savings negative. The setup lines add up to the consolidation's setup series, KT part placed `ktLeadMonths` early.
 */
export function costLines(v: ProductView, L: number, k: Keys): CostRow[] {
  const rows = v.run.rows, conv = model(v.run.ctx).conv, hub = khRunAnnual(v.run.ctx, 0, 1) / 12, s = v.series;
  const eng = (f: (r: (typeof rows)[number]) => number) => lay(v, L, (t) => f(rows[t - 1]!));
  const line = (g: string, name: string, basis: string, sign: string, months: (number | null)[]) => row('line', k(g, name, basis, sign), 'EUR/month', 'eur',
    null, months);
  const denom = conv.setupBase + conv.changeCost, other = (i: number) => s.setup[i]! - s.ktSetup[i]!,
    tooling = (i: number) => other(i) * (denom > 0 ? conv.setupBase / denom : 1);
  const home = (f: (i: number) => number) => layWide(v, v.series.net.length, f).map((x, i) => (i >= v.month0 ? x : null));
  return [
    line('Run costs', 'Agentic run team (AgentOps)', 'engine row runTeamCost', COST, eng((r) => r.runTeamCost)),
    line('Run costs', 'Tokens', 'engine row tokenCost', COST, eng((r) => r.tokenCost)),
    line('Run costs', 'Infrastructure', 'engine row infrastructureCost', COST, eng((r) => r.infrastructureCost)),
    line('Knowledge Hub', 'Knowledge Hub curation', 'knowledgeHubCost less the allocated hub infrastructure', COST,
      eng((r) => r.knowledgeHubCost - (r.knowledgeHubCost > 0 ? hub : 0))),
    line('Knowledge Hub', 'Knowledge Hub infrastructure (allocated)', 'khInfraMonthly of the resolved case (hub allocation)', COST,
      eng((r) => (r.knowledgeHubCost > 0 ? hub : 0))),
    line('Taxes and rework', 'Verification tax', 'engine row verificationTaxCost', COST, eng((r) => r.verificationTaxCost)),
    line('Taxes and rework', 'External rework loops', 'engine row externalReworkCost', COST, eng((r) => r.externalReworkCost)),
    line('Taxes and rework', 'Compliance tax', 'engine row complianceTaxCost', COST, eng((r) => r.complianceTaxCost)),
    line('Savings', 'Knowledge transfer avoided', 'engine row knowledgeTransferAvoided (negative = saving)', SAVE, eng((r) => -r.knowledgeTransferAvoided)),
    line('Setup', 'Setup: tooling, training, coaching, governance', 'setup rows of the consolidated series', COST, home(tooling)),
    line('Setup', 'Setup: engagement change cost', 'setup rows of the consolidated series', COST, home((i) => other(i) - tooling(i))),
    line('Setup', 'Setup: Knowledge Hub and knowledge transfer (KT)', `KT setup placed ${v.lead} month(s) before month 0`, COST,
      layWide(v, L, (i) => s.ktSetup[i]!)),
  ];
}
