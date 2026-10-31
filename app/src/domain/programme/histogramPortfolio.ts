/** @calc-zone delivery-views */
import type { Consolidated } from '../portfolio/consolidate';
import { opModelCompute } from '../tune/opmodel';
import { flagsOf, programmeHistogram, rolesOf, type HistLine, type ProgrammeHistogram } from './histogram';
import { laneDef, type LaneRole } from './lanes';

/**
 * The programme histogram of the Wave and Portfolio scopes (docs/SPEC_BPMN.md § 19.8 F-B76; phase B9d): each planned product's histogram (the
 * one owner, `programmeHistogram`) laid on the portfolio calendar at its month 0 (calendar month = month 0 + product month), summed by role.
 * A role's capacity is the sum of the products' operating-model FTE (Y1). The transformation team's capacity `maxConcurrentSetups` is checked
 * too: a month with more products in setup than it allows is flagged (the wave schedule never builds one; an edited calendar could).
 */
export interface SetupFlag { month: number; inSetup: number; capacity: number }
export interface PortfolioHistogram extends ProgrammeHistogram { setupFlags: SetupFlag[] }

export function portfolioHistogram(k: Consolidated, capacity: number | null, waveId?: string): PortfolioHistogram {
  const views = k.products.filter((v) => !waveId || v.waveId === waveId);
  const each = views.map((v) => ({ v, h: programmeHistogram(v.run.ctx, v.run.rows.length) }));
  const from = Math.min(1, ...each.map(({ v, h }) => v.month0 + h.from)), to = Math.max(k.horizon, ...each.map(({ v, h }) => v.month0 + h.to));
  const n = to - from + 1, wdMonth = each[0]?.h.wdMonth ?? 220 / 12, lines: HistLine[] = [];
  for (const { v, h } of each) {
    for (const l of h.lines) {
      const days = new Array<number>(n).fill(0);
      l.days.forEach((d, i) => { days[v.month0 + h.from + i - from]! += d; });
      lines.push({ ...l, label: `${v.name}: ${l.label}`, days });
    }
  }
  const cap = new Map<LaneRole, number>();
  for (const { v } of each) {
    const t = (() => { try { return opModelCompute(v.run.ctx, 0); } catch { return null; } })();
    for (const role of ['aiOffice', 'designAuthority', 'orchestrator', 'aiReviewer', 'preceptor', 'agentArchitect', 'finops'] as LaneRole[]) {
      const f = laneDef(role).topology;
      if (t && f) cap.set(role, (cap.get(role) ?? 0) + t[f]);
    }
  }
  const roles = rolesOf(lines, n, (lane) => cap.get(lane) ?? null), setupFlags: SetupFlag[] = [];
  if (capacity !== null) {
    for (let m = Math.max(0, from); m <= to; m++) {
      const inSetup = views.filter((v) => m >= v.month0 && m < v.month0 + v.run.setupMonths).length;
      if (inSetup > capacity) setupFlags.push({ month: m, inSetup, capacity });
    }
  }
  return { from, to, wdMonth, lines, roles, flags: flagsOf(roles, from, wdMonth), setupFlags };
}
