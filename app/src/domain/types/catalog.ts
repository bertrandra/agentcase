export interface Phase { id: string; name: string; sdlc: number; reg: number; role: string; seq: number }
export interface Location { name: string; cls: string }
export interface Artefact {
  id: string; name: string; phase: string; value: string; skill: string; aiAuth: string;
  humanSup: number; agentSup: number; effort: number; deliverable: string; isReg?: boolean; industry?: string; norm?: string;
}
export interface LoopPair {
  id: string; label: string; internalIter: number; extReworkPct: number; extFrom?: string; extTo?: string; extCostShare: number;
}
export interface EvtClassSeed { label: string; phi: number; kappa: number; gamma: number }
export interface StatusLifecycleDef { id: string; label?: string; autoPosture: number; weights: Record<string, number> }
