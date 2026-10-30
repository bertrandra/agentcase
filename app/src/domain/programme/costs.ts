/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { khRunAnnual, khSetupCost } from '../knowledge';
import { model } from '../model/overlay';
import { coachView } from '../tune/maturityTab';
import { pilotSizing } from '../tune/program';
import { runSizingView } from '../tuneB/runSizing';
import { setupBreakdown, setupLineAmount, type SetupLineId } from '../tuneB/setup';
import { COST_RULE_TEXT, type ProgrammeActivityDef } from './catalogue';

/**
 * What a programme activity costs, read from today's single owners (§ 19.3; phase B9a: no formula of its own, no figure moves): the setup lines
 * (`setupBreakdown`), the pilot (`pilotSizing`), the hub (`khSetupCost`, `khRunAnnual`), the AgentOps run team (the engine) and the coaching
 * curve (informative, outside the euro result: T5). `effortDays` is the labour behind a resources cost at the target day rate, where it is known.
 */
export interface ActivityCost { amount: number | null; per: 'once' | 'year 1' | null; effortDays: number | null; rule: string; note: string }
const LINE: Record<string, SetupLineId> = {
  setupTooling: 'tooling', setupTraining: 'training', setupCoaching: 'coaching', setupGovernance: 'governance', change: 'change',
};
const none = (d: ProgrammeActivityDef, note = ''): ActivityCost => ({ amount: null, per: null, effortDays: null, rule: COST_RULE_TEXT[d.costRule], note });

export function activityCost(c: Ctx, d: ProgrammeActivityDef): ActivityCost {
  const m = model(c), rate = m.tgtTJM || 600, wd = m.wd || 220, base = none(d);
  const days = (eur: number): number | null => (eur > 0 && rate > 0 ? eur / rate : null);
  try {
    const line = LINE[d.kind];
    if (line) {
      const amount = setupLineAmount(setupBreakdown(c), line), out: ActivityCost = { ...base, amount, per: 'once' };
      if (d.costRule === 'resources') out.effortDays = days(amount);
      if (d.kind === 'setupCoaching') {
        const k = coachView(c);
        out.note = `Coaching curve (informative, outside the euro result): Y1 ${Math.round(k.y1)}% → cruise ${Math.round(k.cruise)}% of capacity`;
      }
      return out;
    }
    switch (d.kind) {
      case 'pilot': { const p = pilotSizing(c); return { ...base, amount: p.cost, per: 'once', effortDays: p.fte * (p.totalWeeks / 52) * wd }; }
      case 'hubSetup': { const x = khSetupCost(c); return { ...base, amount: x, per: 'once', effortDays: days(x) }; }
      case 'ktPrep': return { ...base, amount: khSetupCost(c), per: 'once', note: 'The hub setup amount, placed before the wave; never added again' };
      case 'hubRun': return { ...base, amount: khRunAnnual(c, rate, wd), per: 'year 1' };
      case 'agentops': { const v = runSizingView(c); return { ...base, amount: v.rc[0] ?? null, per: 'year 1', note: 'Run team cost of year 1 (engine)' }; }
      case 'build': return { ...base, note: 'The adoption ramp of the engine (S-curve): its savings and costs are the case\'s result' };
      default: return base;
    }
  } catch { return base; }
}
