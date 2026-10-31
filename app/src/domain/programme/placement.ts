/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import type { Portfolio } from '../portfolio/types';
import type { ProgrammeActivityDef } from './catalogue';
import { optInOfKind, optInPlan } from './optIn';
import { coachLoad, horizonMonthsOf, programmeRates } from './profile';
import { hubSetupTiming, ktPrepMonths, lineMonths, pilotTiming, programmeCalendar, setupMonths, stageTimings, type Span } from './timing';

/**
 * Duration and placement of a programme activity, as the timing owner gives them (`timing.ts`, F-B65): the bar on the case calendar (months
 * from the roadmap start) where the Gantt draws one, and the one reading every surface makes (phase B9b: T1–T4 collapsed to D-B27…D-B29).
 */
export interface Placement { text: string; span: Span | null }
const r1 = (n: number): string => String(Math.round(n * 10) / 10);
const HORIZON = 600;   // months: long enough for every bar; the run bars end at the Gantt's horizon on the Gantt
/** The duration key of a setup activity with its own duration (D-B27 (c)); the others last the setup duration. */
const DURATION_KEY: Record<string, string> = { setupTraining: 'trainMonths', setupGovernance: 'govMonths' };

function optInText(c: Ctx, kind: string): string {
  const d = optInOfKind(kind);
  if (!d) return 'Over the horizon';
  const H = horizonMonthsOf(c), p = optInPlan(c, d.id, H, programmeRates(c).wd);
  const when = p.from >= 1 ? `from the product's month ${p.from}` : 'before the build (charged from month 1 in the case\'s cash flow)';
  return `${r1(p.months)} month(s) ${when}${d.level === 'case' ? ', once for the case' : ''}; off by default (switch it on below)`;
}

export function placementOf(c: Ctx, d: ProgrammeActivityDef, pf?: Portfolio, productId?: string): Placement {
  const cal = programmeCalendar(c, HORIZON, { showStages: true, hub: true }), setup = setupMonths(c);
  const prod = pf?.products.find((p) => p.id === (productId ?? pf.activeProductId)), lead = prod ? ktPrepMonths(prod.knowledge) : null;
  switch (d.timing) {
    case 'stage': {
      const s = cal.stages.find((x) => `stage-${x.stage.id}` === d.kind)!, w = (s.start * 52) / 12;
      const pilot = s.stage.input ? '' : ' (the pilot\'s weeks: Pilot & Prove is the pilot)';
      return { text: `${s.weeks} weeks${pilot} from week ${r1(w)} after the case start`, span: { start: s.start, dur: s.dur } };
    }
    case 'gate': {
      const weeks = stageTimings(c).reduce((a, s) => a + s.weeks, 0);
      return { text: `Gate at week ${r1(weeks)} after the case start, when Pilot & Prove ends`, span: null };
    }
    case 'pilot': {
      const p = pilotTiming(c), s = cal.stages.find((x) => x.stage.id === 'pilotProve');
      return { text: `${p.totalWeeks} weeks (${p.weeks} prove + 2 × ${p.breakIn} break-in): the Pilot & Prove stage, before the build; it ends at `
        + `the product's month 0, so its cost falls in the ${p.leadMonths} months before the build (from calendar month 1 when the calendar has `
        + 'no earlier month)', span: s ? { start: s.start, dur: s.dur } : null };
    }
    case 'setup': {
      if (d.kind === 'setupCoaching') return { text: `Over the horizon along the coaching curve: Y1 ${r1(coachLoad(c, 1))}%, Y2 ${r1(coachLoad(c, 2))}%, `
        + `then cruise ${r1(coachLoad(c, 3))}% of the entry team's capacity`, span: null };
      const m = lineMonths(c, DURATION_KEY[d.kind] ?? null), own = DURATION_KEY[d.kind] && m !== setup ? ' (its own duration)' : ' (the setup duration)';
      return { text: `${r1(m)} months${own} from the product's month 1, spent evenly`, span: { start: cal.build.start, dur: m } };
    }
    case 'hubSetup': {
      const h = hubSetupTiming(c), before = lead === null ? 'a single case has no earlier month, so it starts at month 1'
        : `it starts ${lead} month(s) before (the knowledge-transfer preparation, capped at calendar month 1)`;
      return { text: `${h.days} days (${r1(h.months)} months), ready by the product's month 0: ${before}. The common hub is set up once, before the `
        + 'first wave', span: cal.hubSetup && { start: cal.hubSetup.start, dur: cal.hubSetup.dur } };
    }
    case 'ktPrep':
      return { text: lead === null ? 'Before the product\'s month 0 (set per product in a portfolio)' : `${lead} months before the product's month 0`,
        span: null };
    case 'build': return { text: `${r1(setup)} months after the onboarding stages (the setup duration)`, span: cal.build };
    case 'run': return { text: `From month ${r1(cal.run.start)} after the case start to the horizon`, span: null };
    case 'hubRun': return { text: `From month ${r1(cal.hubRun?.start ?? 0)} after the case start to the horizon (charged in years with agents)`,
      span: null };
    case 'optIn': return { text: optInText(c, d.kind), span: null };
    default: return { text: 'Over the horizon', span: null };
  }
}
