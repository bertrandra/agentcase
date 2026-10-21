/** Shape of a case = the legacy snapshot state (what collectSnapshotState() returns). Only the keys the engine reads are typed. */
export interface DomState { values: Record<string, string>; checked: Record<string, boolean> }
export interface TeamRow { skill: string; grade: string; loc: string; etp: number; pins?: unknown[] }
export interface ArtefactEdit { id: string; agentSup?: number; humanSup?: number; effort?: number; seq?: number }
export interface CurvePoint { t: number; a: number }
export interface ScurveState { pts: CurvePoint[] | null; family: string; curve: string }
export interface TokenModel { name: string; mix: number; priceIn: number; priceOut: number }
export interface StatusLifecycleState { id: string; autoPosture?: number; weights?: Record<string, number> }
export type Coef = Record<string, number>;
export interface EngageCoefRow {
  label: string; maturityCap: number; rampSpeed: number; glassFactor: number; setupBillable: number; infraOwner: string;
  riskPremium: number; authorityCap: number; rampCapPct: number; mcWiden: number; khMaxCC: number;
}

export interface ModelFlags { lce: boolean; evt: boolean; sup: boolean; mcs: boolean; cbd: boolean; flow: boolean; evl: boolean }
export interface LceLoopState { id: string; pAccept: number; tRev: number; cGen: number | null; calibResidual: number; clamped: boolean }
export interface ModelState {
  FLAGS: ModelFlags;
  LCE: { loops: LceLoopState[]; nMax: number; fallbackCost: number; calibrated: boolean; built?: boolean };
  EVT: { classMap: Record<string, string>; phiTable: Record<string, number>; kappa: Record<string, number>; gamma: Record<string, number>;
         rSource: string; rDirect: number; mode: string; ackNegativeNet: boolean };
  SUP: { provision: string; supervisors: number; supervisorCost: number; hoursPerPeriod: number; mode: string; rampRate: number; rampCap: number };
  CBD: { driftRate: number; appliesTo: string };
  CASE: { discountRate: number };
  [k: string]: unknown;
}

export interface CaseState {
  dom: DomState;
  teamIn: TeamRow[];
  RATE: Record<string, Record<string, number>>;
  targetLocPct: Record<string, number> | null;
  selectedArtefacts: string[];
  artefactsEdited: ArtefactEdit[];
  selectedRegArtefacts: string[];
  regArtefactsEdited: ArtefactEdit[];
  phaseOff: string[];
  selectedNorms: string[];
  phaseSeq?: { id: string; seq: number | null }[];
  regInclude: boolean;
  forceGlassCeiling: boolean;
  lifecycleUse: boolean;
  lifecyclePos: number;
  statusLifecycle: StatusLifecycleState[];
  TOKEN_MODELS: TokenModel[];
  TOK_OUT_SHARE: number;
  COEF: Coef;
  MODEL: ModelState;
  engageCoef: Record<string, EngageCoefRow>;
  scurve: ScurveState;
  MATURITY_MAP?: { rampBounds?: number[] };
}
