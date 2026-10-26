/** @calc-zone tuning-programme */
import type { Ctx } from '../ctx';
import { hriBandOf, hriCostPerFTE, hriEnabled, hriIndex, hriIntensity, type HriBand } from '../engagement';
import { teamInCost } from '../location';
import type { ColourRole } from '../theme';

/** Human Readiness Index questionnaire: 18 questions (No 0 / Partial 2 / Yes 4) in 6 themes of 3, ids hriQ0..hriQ17. */
export const HRI_GROUPS: { title: string; q: string[] }[] = [
  { title: 'Leadership & sponsorship', q: ['An executive sponsor is identified and active', 'Transformation objectives are communicated to every team', 'Managers role-model the use of agentic tooling'] },
  { title: 'Fears & resistance', q: ['Job-security concerns are openly addressed', 'The effort-conservation narrative (FTE + vFTE = constant) is carried by management', 'Resistance signals are collected and acted upon'] },
  { title: 'Skills & training', q: ['A role-based agentic training path exists', 'Training budget and time are allocated', 'Prompting / supervision skills are assessed'] },
  { title: 'Champions & preceptorship', q: ['Champions are identified per team / pod', 'Preceptors (senior coaches) are designated', 'Champion & preceptor time is protected in the plan'] },
  { title: 'Incentives & career', q: ['Individual objectives are aligned with the transformation', 'New roles (Agent Supervisor, AI QA, AI FinOps) are recognised in career paths', 'Adoption is rewarded, not just measured'] },
  { title: 'Communication & rituals', q: ['Team rituals were adapted to human + agent delivery', 'A field feedback loop feeds the programme', 'Successes and failures are shared transparently'] },
];

export interface HriSummary {
  on: boolean; index: number; band: HriBand; label: string; tone: ColourRole; intensity: string; etp: number; costPerFte: number; cost: number; drag: number;
}
const BAND_READOUT: Record<HriBand, [ColourRole, string]> = { light: ['teal-700', 'Ready'], standard: ['warning-600', 'Fragile'], intensive: ['danger-800', 'At risk'] };

/** What the Human Readiness card shows (legacy renderHri). The drag uses the rounded index, like the legacy read-out. */
export function hriSummary(c: Ctx): HriSummary {
  const idx = Math.round(hriIndex(c)), etp = teamInCost(c.s, c.inp).etp, costPerFte = hriCostPerFTE(c);
  const { hriFloor, hriSlope } = c.s.COEF as { hriFloor: number; hriSlope: number };
  const band = hriBandOf(idx), [tone, label] = BAND_READOUT[band];
  return {
    on: hriEnabled(c), index: idx, band, label, tone, intensity: hriIntensity(c), etp, costPerFte,
    cost: etp * costPerFte, drag: Math.max(hriFloor, hriFloor + (hriSlope * idx) / 100),
  };
}
