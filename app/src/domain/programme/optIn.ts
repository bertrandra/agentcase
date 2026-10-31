/** @calc-zone run-setup-taxes */
import type { Ctx } from '../ctx';
import { pilotTiming, setupMonths, spreadMonths, stageTimings } from './timing';

/**
 * The opt-in programme activities (docs/SPEC_BPMN.md § 19.2, § 19.3; decision D-B31, phase B9b): new costs, OFF by default, so no figure of an
 * existing case moves. Each is switched on by its own key (value "on") in the Process section's parameter panel; on, its labour (days × the
 * programme's role rate, `profile.ts`) enters the programme cost (the setup of the euro result) and the cash flow, placed where its activity sits.
 * Parameters left blank read their default. Engagement stages, value tracking, AI Act obligations and audit interviews (case level), and the four
 * agent-rollout activities: licence procurement (case level), agent-toolchain integration, rollout hypercare, legacy decommissioning (per product).
 */
export type OptInId = 'stages' | 'valueTracking' | 'aiAct' | 'audit' | 'procurement' | 'integration' | 'hypercare' | 'decommission';
export interface OptInDef {
  id: OptInId; label: string; level: 'case' | 'product';
  /** the key that switches it on ("on") */
  on: string;
  /** the activity kinds of the programme catalogue that carry this cost */
  kinds: string[];
  /** its parameters: key, label, unit, default */
  params: { key: string; label: string; unit: string; def: number; step: number }[];
}
const P = (key: string, label: string, unit: string, def: number, step = 1) => ({ key, label, unit, def, step });
export const OPT_INS: readonly OptInDef[] = [
  { id: 'stages', label: 'Engagement stages', level: 'case', on: 'optStages', kinds: ['stage-discover', 'stage-calibrate', 'stage-validate', 'stage-decide'],
    params: [P('stagesFte', 'Engagement team (FTE)', 'FTE', 2, 0.5), P('decideDays', 'Decide & Scale workshop (days)', 'days', 5)] },
  { id: 'valueTracking', label: 'Value tracking', level: 'case', on: 'optValue', kinds: ['valueTracking'],
    params: [P('valueFte', 'FinOps effort (FTE over the horizon)', 'FTE', 0.1, 0.05)] },
  { id: 'aiAct', label: 'Risk mitigations and AI Act obligations', level: 'case', on: 'optAiAct', kinds: ['riskAiAct'],
    params: [P('aiActDays', 'AI Office effort (days per year)', 'days/year', 10)] },
  { id: 'audit', label: 'Audit and discovery interviews', level: 'case', on: 'optAudit', kinds: ['auditInterviews'],
    params: [P('auditDays', 'Interview effort (days)', 'days', 10)] },
  { id: 'procurement', label: 'Licence procurement', level: 'case', on: 'optProcure', kinds: ['procurement'],
    params: [P('procureDays', 'Procurement, security and legal effort (days)', 'days', 20)] },
  { id: 'integration', label: 'Agent-toolchain integration', level: 'product', on: 'optIntegr', kinds: ['integration'],
    params: [P('integrations', 'Integrations (tools connected)', 'tools', 5), P('integrDays', 'Effort per integration (days)', 'days', 5)] },
  { id: 'hypercare', label: 'Rollout hypercare', level: 'product', on: 'optHypercare', kinds: ['hypercare'],
    params: [P('hypercareFte', 'Hypercare team (FTE)', 'FTE', 1, 0.5), P('hypercareWeeks', 'Hypercare (weeks)', 'weeks', 6)] },
  { id: 'decommission', label: 'Legacy decommissioning', level: 'product', on: 'optDecom', kinds: ['decommission'],
    params: [P('decomDays', 'Decommissioning effort (days)', 'days', 10),
      P('decomSaving', 'Licences ended (€/month saved, only when entered)', '€/month', 0, 100)] },
];
export const optInDef = (id: OptInId): OptInDef => OPT_INS.find((d) => d.id === id) as OptInDef;
/** The opt-in cost an activity kind belongs to (undefined: not an opt-in activity). */
export const optInOfKind = (kind: string): OptInDef | undefined => OPT_INS.find((d) => d.kinds.includes(kind));
export const optInOn = (c: Ctx, d: OptInDef): boolean => c.inp.v(d.on) === 'on';
/** A parameter of an opt-in activity: a number ≥ 0 entered, else its default. */
export function optParam(c: Ctx, key: string): number {
  const def = OPT_INS.flatMap((d) => d.params).find((p) => p.key === key)?.def ?? 0, n = c.inp.p(key);
  return !isNaN(n) && n >= 0 ? n : def;
}

/** An opt-in activity's effort, placement and saving, in product months (1 = the build's first month; ≤ 0 before the build). */
export interface OptInPlan { days: number; from: number; months: number; saving: { from: number; perMonth: number } | null }
export function optInPlan(c: Ctx, id: OptInId, H: number, wd: number): OptInPlan {
  const q = (k: string) => optParam(c, k), perMonth = wd / 12, perWeek = wd / 52, setup = Math.min(setupMonths(c), H);
  const pilotLead = pilotTiming(c).leadMonths;
  switch (id) {
    case 'stages': {
      const weeks = stageTimings(c).filter((s) => s.stage.input).reduce((a, s) => a + s.weeks, 0), m = (weeks * 12) / 52;
      return { days: q('stagesFte') * weeks * perWeek + q('decideDays'), from: 1 - Math.ceil(m - 1e-9) - pilotLead, months: m, saving: null };
    }
    case 'valueTracking': return { days: q('valueFte') * H * perMonth, from: 1, months: H, saving: null };
    case 'aiAct': return { days: (q('aiActDays') * H) / 12, from: 1, months: H, saving: null };
    case 'audit': return { days: q('auditDays'), from: 1 - Math.max(1, pilotLead), months: 1, saving: null };
    case 'procurement': return { days: q('procureDays'), from: 0, months: 1, saving: null };
    case 'integration': return { days: q('integrations') * q('integrDays'), from: 1, months: setup, saving: null };
    case 'hypercare': return { days: q('hypercareFte') * q('hypercareWeeks') * perWeek, from: 1, months: Math.min(H, (q('hypercareWeeks') * 12) / 52),
      saving: null };
    case 'decommission': {
      const at = Math.min(H, Math.ceil(setup - 1e-9) + 1);
      return { days: q('decomDays'), from: at, months: 1, saving: q('decomSaving') > 0 && at < H ? { from: at + 1, perMonth: q('decomSaving') } : null };
    }
  }
}
/** The spend of an opt-in activity month by month from its first month (its cost spread over its duration). */
export const optInMonths = (cost: number, p: OptInPlan): number[] => spreadMonths(cost, p.months);
