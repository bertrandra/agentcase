/** @calc-zone exports */
import { khRunAnnual } from '../knowledge';
import { lineOnMonths, programmeLines } from '../programme/profile';
import { lay, layWide } from './costModelAxis';
import { row } from './costModelRow';
import type { CostRow } from './costModelTypes';
import type { ProductView } from './waves';

export const COST = 'cost (+)', SAVE = 'saving (-)';

export type Keys = (group: string, line: string, basis: string, sign: string) => string[];

/**
 * The cost lines of a product other than its team, month by month, from its Time Engine rows and its calendar series (no financial formula of its own).
 * Costs are positive and savings negative. The setup lines are the programme's cost lines (`programmeLines`, the engine's own profile: one row per
 * activity in the euro result, on the product's months) and the Knowledge Hub part from the consolidated series (placed `ktLeadMonths` early);
 * they add up to the consolidation's setup series.
 */
export function costLines(v: ProductView, L: number, k: Keys): CostRow[] {
  const rows = v.run.rows, hub = khRunAnnual(v.run.ctx, 0, 1) / 12, s = v.series, H = rows.length;
  const eng = (f: (r: (typeof rows)[number]) => number) => lay(v, L, (t) => f(rows[t - 1]!));
  const line = (g: string, name: string, basis: string, sign: string, months: (number | null)[]) => row('line', k(g, name, basis, sign), 'EUR/month', 'eur',
    null, months);
  const setup = programmeLines(v.run.ctx, H).filter((l) => l.id !== 'knowledge').map((l) => {
    const m = lineOnMonths(l, H);
    return line('Setup', `Setup: ${l.label}`, `programme cost profile, ${l.rule === 'nonLabour' ? 'amount' : l.rule} (engine setup rows)`, COST,
      lay(v, L, (t) => m[t - 1] ?? 0));
  });
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
    ...setup,
    line('Setup', 'Setup: Knowledge Hub and knowledge transfer (KT)', `KT setup placed ${v.lead} month(s) before month 0`, COST,
      layWide(v, L, (i) => s.ktSetup[i]!)),
  ];
}
