/** @calc-zone tuning-programme */
import type { Ctx } from '../ctx';
import { hriIndex } from '../engagement';
import { teamInCost } from '../location';
import { sddMaturity } from '../model/vtax';
import { maturityInfo } from './maturity';
import { modelOf } from './memo';

// Wave 3 — EV-16 SDD & tooling maturity · EV-19 coaching curve · EV-20/29 measurement socle · EV-24 governance gates.

export const SDD_LEVELS: [number, string, string][] = [
  [0, 'Vibe coding', 'Ad-hoc prompting; the spec lives in people’s heads; code is the only artifact.'],
  [25, 'Emerging specs', 'Some written requirements; agents used tactically; high re-prompting.'],
  [50, 'Spec-first', 'EARS-style testable requirements; the spec drives generation; regeneration is routine.'],
  [75, 'Spec-Driven Development', 'The spec is the primary executable artifact; code is a regenerable output; x3–x10 first-try success.'],
  [100, 'SDD + living metamodel', 'Spec + Knowledge Graph ground every generation; EDF-style −40% re-prompting; near-deterministic quality.'],
];
export const harnessMaturity = (c: Ctx): number => { const v = c.inp.p('harnessMat'); return isNaN(v) ? 0 : Math.max(0, Math.min(100, v)); };

export function sddView(c: Ctx) {
  const x = sddMaturity(c);
  let lv = SDD_LEVELS[0] as (typeof SDD_LEVELS)[number];
  for (const l of SDD_LEVELS) if (x >= l[0]) lv = l;
  return { sdd: x, name: lv[1], text: lv[2], taxCut: Math.round(0.5 * x), harness: harnessMaturity(c) };
}

export const AUTONOMY_TIERS: [string, string, string][] = [
  ['Intensive coaching', 'Y1', 'Preceptor 3:1–5:1, review-first, explain-the-code gates'],
  ['On-demand support', 'Y1–Y2', 'Office hours, pairing on demand, champions relay'],
  ['Self-service', 'Y2–Y3', 'Playbooks, internal certification, communities of practice'],
  ['Community of practice', 'cruise', 'Peer support only; coaching decays deliberately'],
];
/** Coaching load (% of capacity) in Y1, Y2 (mid-way) and Y3, with its indicative yearly cost. */
export function coachView(c: Ctx) {
  const m = modelOf(c), y1 = c.inp.p('coachY1'), cruise = c.inp.p('coachCruise');
  const a = isNaN(y1) ? 40 : y1, z = isNaN(cruise) ? 20 : cruise, etp = teamInCost(c.s, c.inp).etp;
  const loads = [a, (a + z) / 2, z];
  return { y1: a, cruise: z, loads, costs: loads.map((p) => etp * (p / 100) * (m.tgtTJM || 600) * (m.wd || 220)) };
}

export type SocleRow = [string, string, string];
export interface SocleFamily { title: string; tone: 'teal' | 'blue' | 'amber' | 'brick'; rows: SocleRow[] }
export function socleView(c: Ctx): { level: number; families: SocleFamily[] } {
  const m = modelOf(c), hri = Math.round(hriIndex(c)), vt = m.conv?.vTaxRate;
  return {
    level: maturityInfo(c, m).capped,
    families: [
      { title: 'DORA — flow & stability', tone: 'teal', rows: [
        ['Deploy frequency', 'target ↑', 'higher with agentic CI/CD; watch it does not trade off stability'],
        ['Lead time for change', 'target ↓', 'shorter as coding ceases to be the bottleneck'],
        ['Change failure rate', 'guardrail', 'stability guardrail — +25% AI adoption came with −7.2% stability (DORA 2024)'],
        ['MTTR', 'target ↓', 'faster recovery with agent-assisted triage']] },
      { title: 'SPACE — beyond throughput', tone: 'blue', rows: [
        ['Satisfaction & well-being', 'survey', 'developer experience under human+agent delivery'],
        ['Performance (outcomes)', 'outcome', 'value delivered, not lines produced'],
        ['Activity', 'context', 'use with care — volume can inflate'],
        ['Communication & collaboration', 'flow', 'pod & review-gate health']] },
      { title: 'AI signals', tone: 'amber', rows: [
        ['AI-code share', 'context', '% of merged code with agent authorship'],
        ['Cost per successful result', '$/result', 'total cost / accepted output — see FinOps'],
        ['AI-attributed defect rate', 'guardrail', 'tie to the AI code-quality premium (EV-23)'],
        ['Verification tax', '%', 'review effort turning addressable into net gain (EV-27) ' + (vt ? `≈ ${Math.round(vt * 100)}%` : '')],
        ['PR cycle time by AI involvement', 'split', 'segment flow by agent involvement']] },
      { title: 'Human early-warning indicators', tone: 'brick', rows: [
        ['Time-to-judgment', '↓ risk if rising', 'how long to reach a sound decision — erosion signal'],
        ['Bus factor', '↑ better', 'concentration of irreplaceable knowledge'],
        ['% mentoring compensated', 'target ≥ 100%', `is coaching time protected vs billable pressure · HRI ${hri}/100`]] },
    ],
  };
}

export const GOV_GATES: [string, string][] = [
  ['Non-bypassable CI gates', 'Mandatory before merge; the wall that does not move'],
  ['C2 quality control', 'Tests, mutation testing, security scanning'],
  ['Human-in-the-Lead review', 'Risk-based review effort by phase (see supervision matrix)'],
  ['Anti-false-success guardrails', 'Detect deleted tests, disabled lint, lowered coverage'],
  ['Enlarged Definition of Done', 'Adds: agent provenance recorded, review evidence, security check, doc updated, AI-BOM entry'],
  ['AI-BOM (AI Bill of Materials)', 'Models, datasets, MCP services, skills used — traceability & supply-chain audit'],
];
