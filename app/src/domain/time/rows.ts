/** @calc-zone time-engine */
import type { Econ, K } from './kernel';
import { levelLabelFor } from '../maturityBounds';

export interface MonthRow {
  monthIndex: number; yearIndex: number; quarterIndex: number; adoptionRampPct: number; humanFte: number; agentVfte: number; agentVfteRaw: number;
  runTeamFte: number; totalEquivalentCapacity: number; effectiveAutomationPct: number; realizedAutomationPct: number; agenticSharePct: number;
  humanSharePct: number; teamCost: number; tokenCost: number; infrastructureCost: number; runTeamCost: number; knowledgeHubCost: number;
  knowledgeTransferAvoided: number; verificationTaxCost: number; externalReworkCost: number; complianceTaxCost: number; setupCost: number;
  totalRunCost: number; total: number; grossSavings: number; netSavings: number; maturityLevel: string; curveModelId: string; sourceInputHash: string;
}

/** Maturity level L1..Ln for an adoption level (bounds are the single source of truth, editable in the case: `rampBoundsOf`). */
export const maturityLevelFor = levelLabelFor;

export function monthRow(e: Econ, K: K): MonthRow {
  return {
    monthIndex: e.t, yearIndex: e.y + 1, quarterIndex: Math.floor(((e.t - 1) % 12) / 3) + 1, adoptionRampPct: e.r,
    humanFte: e.humanFte, agentVfte: e.agentVfte, agentVfteRaw: e.agentVfteRaw, runTeamFte: e.runTeamFte,
    totalEquivalentCapacity: e.humanFte + e.agentVfte, effectiveAutomationPct: K.eff, realizedAutomationPct: (e.r / 100) * K.eff,
    agenticSharePct: K.baseEtp > 0 ? (e.agentVfte / K.baseEtp) * 100 : 0, humanSharePct: K.baseEtp > 0 ? (e.humanFte / K.baseEtp) * 100 : 0,
    teamCost: e.teamCost, tokenCost: e.tokenCost, infrastructureCost: e.infraCost, runTeamCost: e.runTeamCost, knowledgeHubCost: e.khCost,
    knowledgeTransferAvoided: e.ktAvoid, verificationTaxCost: e.vTax, externalReworkCost: e.loopExt, complianceTaxCost: e.compTax,
    setupCost: e.setupCost, totalRunCost: e.totalRun, total: e.totalRun + e.setupCost, grossSavings: e.grossSav, netSavings: e.grossSav - e.setupCost,
    maturityLevel: maturityLevelFor(e.r, K.maturityBounds), curveModelId: K.curveModelId, sourceInputHash: K.inputHash,
  };
}
