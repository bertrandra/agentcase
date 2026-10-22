/** @calc-zone foundation */
import type { EngageCoefRow } from './state';
import type { PhaseScope } from '../scope';

export interface ModelConv {
  ctxKey: string; ctx: EngageCoefRow; khOn: boolean; khM: number; khSetup: number; khRunYr: number[]; ktAvoidYr: number[];
  ccYears: number[]; vTaxRate: number; vTaxYr: number[]; loopExtRate: number; loopExtYr: number[];
  hriOn: boolean; hriF: number; hri: number; changeCost: number; setupBase: number; setupBillable: number; setupAbsorbed: number; effCap: number;
}
export interface ModelCbd { on: boolean; delta: number; yearBaselineDrift: number[]; yearSavAttributable: number[]; wedge: number[] }
export type ModelSup = { constrained: false } | { constrained: true; esup: number; vMax: number[]; mode: string };

/** What modelRaw() returns; model() overlays the Time-Engine arrays on top of it. */
export interface ModelResult {
  base: { etp: number; cost: number };
  auto: number; ceiling: number; eff: number; ramps: number[]; horizon: number; blendedTJM: number; tgtTJM: number; setupTotal: number;
  yearETP: number[]; yearAgentVfte: number[]; yearETPRaw: number[]; yearAgentVfteRaw: number[]; yearAgentCapacity: number[];
  PROD_FACTOR: number; yearTeamCost: number[]; yearToken: number[]; yearTokenM: number[]; agentRunsYear: number[];
  infraYear: number; yearRun: number[]; yearSav: number[]; baselineRun: number; baseArtMonth: number; yearArtMonth: number[];
  runAgenticETP: number; runAgenticCost: number; yearRunAgenticETP: number[]; yearRunAgenticCost: number[]; yearInfraEff: number[];
  wd: number; tokenCost: number; tokensPerArt: number; scope: PhaseScope; sup: ModelSup; cbd: ModelCbd; conv: ModelConv;
  _curveOverlay?: string; _overlayError?: string;
}
