/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import type { Portfolio } from '../portfolio/types';
import type { ProgrammeActivityDef } from './catalogue';
import { hubSetupTiming, ktPrepMonths, pilotTiming, programmeCalendar, setupTiming, stageTimings, type Span } from './timing';

/**
 * Duration and placement of a programme activity, as the timing owner gives them (`timing.ts`, F-B65): the bar on the case calendar (months
 * from the roadmap start) where the Gantt draws one, and the text of every reading a surface makes. Where surfaces still disagree (T1–T3, kept
 * in B9a), the text names each reading; B9b leaves one.
 */
export interface Placement { text: string; span: Span | null }
const r1 = (n: number): string => String(Math.round(n * 10) / 10);
const HORIZON = 600;   // months: long enough for every bar; the run bars end at the Gantt's horizon on the Gantt

export function placementOf(c: Ctx, d: ProgrammeActivityDef, pf?: Portfolio, productId?: string): Placement {
  const cal = programmeCalendar(c, HORIZON, { showStages: true, hub: true }), setup = setupTiming(c);
  const prod = pf?.products.find((p) => p.id === (productId ?? pf.activeProductId)), lead = prod ? ktPrepMonths(prod.knowledge) : null;
  switch (d.timing) {
    case 'stage': {
      const s = cal.stages.find((x) => `stage-${x.stage.id}` === d.kind)!, w = (s.start * 52) / 12;
      const gantt = s.weeks === s.ganttWeeks ? '' : ` (the Gantt reads ${s.ganttWeeks} weeks)`;
      return { text: `${s.weeks} weeks from week ${r1(w)} after the case start${gantt}`, span: { start: s.start, dur: s.dur } };
    }
    case 'gate': {
      const weeks = stageTimings(c).reduce((a, s) => a + s.weeks, 0);
      return { text: `Gate at week ${r1(weeks)} after the case start, when Pilot & Prove ends`, span: null };
    }
    case 'pilot': {
      const p = pilotTiming(c);
      return { text: `${p.totalWeeks} weeks (${p.weeks} prove + 2 × ${p.breakIn} break-in); the cost model spends it from the product's month `
        + `${p.costFromProductMonth}; the Gantt shows it as the Pilot & Prove stage`, span: null };
    }
    case 'setup':
      return { text: `The engine spends it evenly over the product's months 1–${setup.engineMonths} (the setup profile)`, span: null };
    case 'hubSetup': {
      const h = hubSetupTiming(c);
      return { text: `Gantt: ${h.days} days after the onboarding stages; engine: inside the ${h.engineMonths}-month setup profile; consolidation: `
        + `${lead ?? 0} months before the product's month 0`, span: cal.hubSetup && { start: cal.hubSetup.start, dur: cal.hubSetup.dur } };
    }
    case 'ktPrep':
      return { text: lead === null ? 'Before the product\'s month 0 (set per product in a portfolio)' : `${lead} months before the product's month 0`,
        span: null };
    case 'build': return { text: `${r1(setup.buildMonths)} months after the onboarding stages (Gantt build ramp)`, span: cal.build };
    case 'run': return { text: `From month ${r1(cal.run.start)} after the case start to the horizon`, span: null };
    case 'hubRun': return { text: `From month ${r1(cal.hubRun?.start ?? 0)} after the case start to the horizon (charged in years with agents)`,
      span: null };
    default: return { text: 'Over the horizon', span: null };
  }
}
