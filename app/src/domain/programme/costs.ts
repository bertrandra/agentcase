/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { khRunAnnual, khSetupCost } from '../knowledge';
import { model } from '../model/overlay';
import { pilotSizing } from '../tune/program';
import { runSizingView } from '../tuneB/runSizing';
import { COST_RULE_TEXT, type ProgrammeActivityDef } from './catalogue';
import { optInOfKind, optInOn } from './optIn';
import { coachingPlan, pilotLine, programmeLines, type ProgrammeLineId } from './profile';

/**
 * What a programme activity costs, read from its one owner (§ 19.3; phase B9b): the programme's cost profile (`profile.ts`: the setup lines from
 * resources, coaching (days a month × months), the hub setup, the opt-in activities switched on), the pilot (`pilotSizing`), the hub run
 * (`khRunAnnual`) and the
 * AgentOps run team (the engine). `effortDays` is the labour behind a resources cost.
 */
export interface ActivityCost { amount: number | null; per: 'once' | 'year 1' | null; effortDays: number | null; rule: string; note: string }
const LINE: Record<string, ProgrammeLineId> = {
  setupTooling: 'tooling', setupTraining: 'training', setupCoaching: 'coaching', setupGovernance: 'governance', change: 'change', hubSetup: 'knowledge',
};
const none = (d: ProgrammeActivityDef, note = ''): ActivityCost => ({ amount: null, per: null, effortDays: null, rule: COST_RULE_TEXT[d.costRule], note });

function lineCost(c: Ctx, d: ProgrammeActivityDef, id: ProgrammeLineId, base: ActivityCost): ActivityCost {
  const l = programmeLines(c).find((x) => x.id === id);
  if (!l) return { ...base, note: 'Not in the cost: its module is off' };
  const out: ActivityCost = { ...base, amount: l.amount, per: 'once', effortDays: l.effortDays };
  if (d.kind === 'setupCoaching') {
    const p = coachingPlan(c), r = (n: number) => Math.round(n * 10) / 10;
    out.note = `${r(p.perMonth)} coaching days a month × ${r(p.months)} months × the role rate (D-B30, revised 2026-10-31)`
      + `${p.calibrated ? '; the duration is calibrated from the setup coaching amount' : ''}. The coaching load curve is informative (Maturity)`;
  }
  return out;
}

export function activityCost(c: Ctx, d: ProgrammeActivityDef): ActivityCost {
  const base = none(d);
  try {
    const line = LINE[d.kind];
    if (line) return lineCost(c, d, line, base);
    const opt = optInOfKind(d.kind);
    if (opt) {
      if (!optInOn(c, opt)) return { ...base, note: 'Off (default): not in the programme cost' };
      const l = programmeLines(c).find((x) => x.id === opt.id)!;
      const shared = opt.kinds.length > 1 ? ` (${opt.label}: the cost of the ${opt.kinds.length} activities together)` : '';
      return { ...base, amount: l.amount, per: 'once', effortDays: l.effortDays, note: `In the programme cost${shared}` };
    }
    const m = model(c), rate = m.tgtTJM || 600, wd = m.wd || 220;
    switch (d.kind) {
      case 'pilot': { const p = pilotSizing(c); return { ...base, amount: p.cost, per: 'once', effortDays: pilotLine(c).days }; }
      case 'stage-pilotProve': return { ...base, note: 'The pilot activity\'s cost (the stage is the pilot)' };
      case 'ktPrep': return { ...base, amount: khSetupCost(c), per: 'once', note: 'The hub setup amount, placed before the wave; never added again' };
      case 'hubRun': return { ...base, amount: khRunAnnual(c, rate, wd), per: 'year 1' };
      case 'agentops': { const v = runSizingView(c); return { ...base, amount: v.rc[0] ?? null, per: 'year 1', note: 'Run team cost of year 1 (engine)' }; }
      case 'build': return { ...base, note: 'The adoption ramp of the engine (S-curve): its savings and costs are the case\'s result' };
      default: return base;
    }
  } catch { return base; }
}
