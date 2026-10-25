/** @calc-zone verdict */
import type { CaseState } from '../types/state';

export type Levers = { auto: number | null; y1: number | null; y2: number | null; y3: number | null; ceiling: number | null; setupF: number | null;
  runF: number | null };
export type LeverKey = keyof Levers;
export type LocSplit = 'ASIS' | Record<string, number> | null;
export interface StrategyDef {
  id: string; icon: string; label: string; levers: Levers; locSplit: LocSplit; declared: { risk: number; agility: number }; desc: string;
}
export type Weights = Record<'roi' | 'tco' | 'payback' | 'aiCoverage' | 'humanSup' | 'risk' | 'agility', number>;
export interface StratApplied { id: string; base: Record<string, number>; written: Record<string, number> }

const L = (auto: number | null, y1: number | null, y2: number | null, y3: number | null, ceiling: number | null, setupF: number, runF: number): Levers =>
  ({ auto, y1, y2, y3, ceiling, setupF, runF });
const split = (France: number, Portugal: number, Poland: number, Morocco: number, Egypt: number, China: number, India: number) =>
  ({ France, Portugal, Poland, Morocco, Egypt, China, India });

/** The seven delivery strategies and their default levers (legacy STRATEGY_DEFS_DEFAULT). Empty lever (null) = inherit the live simulation. */
export const STRATEGY_DEFS_DEFAULT: StrategyDef[] = [
  { id: 'tm', icon: '🧾', label: 'T&M', levers: L(0, 0, 0, 0, null, 0, 0), locSplit: 'ASIS', declared: { risk: 2, agility: 2 },
    desc: 'Time & materials baseline — no agentic transformation, AS-IS location mix' },
  { id: 'skill', icon: '🎓', label: 'Skill center', levers: L(15, 30, 60, 85, 25, 0.6, 0.5), locSplit: 'ASIS', declared: { risk: 2, agility: 3 },
    desc: 'Competency pooling with light agent assistance' },
  { id: 'service', icon: '🏭', label: 'Service center', levers: L(25, 35, 65, 90, 20, 0.8, 0.7), locSplit: split(50, 30, 20, 0, 0, 0, 0),
    declared: { risk: 3, agility: 2 }, desc: 'Industrialised delivery with light nearshore' },
  { id: 'hybrid', icon: '🔀', label: 'Hybrid', levers: L(40, 40, 70, 95, 15, 1, 1), locSplit: split(35, 20, 10, 5, 5, 0, 25),
    declared: { risk: 3, agility: 4 }, desc: 'Balanced on/near/offshore with substantial agentic share' },
  { id: 'agentic', icon: '🤖', label: 'Agentic Organization', levers: L(null, null, null, null, null, 1, 1), locSplit: null,
    declared: { risk: 4, agility: 5 }, desc: 'Full current agentic scenario — inherits the simulation levers as-is' },
  { id: 'offshore', icon: '🌏', label: 'Offshore', levers: L(20, 35, 65, 90, 22, 0.7, 0.8), locSplit: split(20, 10, 0, 0, 0, 15, 55),
    declared: { risk: 4, agility: 3 }, desc: 'Cost-led delivery ~70% offshore, moderate agent use' },
  { id: 'nearshore', icon: '🌍', label: 'Nearshore', levers: L(25, 40, 70, 90, 18, 0.8, 0.8), locSplit: split(30, 25, 20, 15, 0, 0, 10),
    declared: { risk: 3, agility: 3 }, desc: 'European proximity delivery ~60% nearshore, moderate agent use' },
];
export const STRAT_WEIGHTS_DEFAULT: Weights = { roi: 20, tco: 15, payback: 10, aiCoverage: 15, humanSup: 10, risk: 15, agility: 15 };

type Keyed = CaseState & { strategyDefs?: StrategyDef[]; stratWeights?: Weights; stratApplied?: StratApplied | null };
export const strategyDefsOf = (s: CaseState): StrategyDef[] => (s as Keyed).strategyDefs ?? STRATEGY_DEFS_DEFAULT;
export const stratWeightsOf = (s: CaseState): Weights => (s as Keyed).stratWeights ?? STRAT_WEIGHTS_DEFAULT;
export const stratAppliedOf = (s: CaseState): StratApplied | null => (s as Keyed).stratApplied ?? null;
