/** @calc-zone exports */
import { khRunAnnual } from '../knowledge';
import { lineOnMonths, programmeLines } from '../programme/profile';
import { pilotMonths, pilotSizing } from '../tune/program';
import { lay, layWide } from './costModelAxis';
import { row } from './costModelRow';
import type { CostRow } from './costModelTypes';
import type { ProductView } from './waves';

export const COST = 'cost (+)', SAVE = 'saving (-)';

/**
 * The pilot's monthly spend on the calendar (decision D4), spread by `pilotMonths`, empty outside the pilot months. Placed before the build
 * (D-B28, the Pilot & Prove stage): it ends at the product's month 0, so its last month is calendar month month0; a pilot that would start before
 * calendar month 1 starts there (the calendar has no earlier month), like a knowledge-transfer lead.
 */
export function pilotCells(v: ProductView, L: number): (number | null)[] {
  const pm = pilotMonths(pilotSizing(v.run.ctx)), from = Math.max(0, v.month0 - pm.length), out = new Array<number | null>(L).fill(null);
  pm.forEach((x, k) => { if (from + k < L) out[from + k] = x; });
  return out;
}
/** a + b month by month; an empty b leaves a as it is. */
export const plus = (a: (number | null)[], b: (number | null)[]): (number | null)[] => a.map((x, i) => (b[i] == null ? x : (x ?? 0) + (b[i] as number)));
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
