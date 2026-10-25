/** @calc-zone foundation */
import type { CaseState, DomState } from '../types/state';

/** Everything of a case except the entry team (shared defaults of the portfolio). */
export type CommonCase = Omit<CaseState, 'teamIn'>;

/** Top-level case keys a product may override (spec 4.3). `dom` is overridden field by field, see `Overrides.dom`. */
export const OVERRIDABLE_KEYS = [
  'selectedArtefacts', 'artefactsEdited', 'selectedRegArtefacts', 'regArtefactsEdited', 'phaseOff', 'phaseSeq', 'selectedNorms', 'regInclude',
  'lifecycleUse', 'lifecyclePos', 'statusLifecycle', 'targetLocPct', 'forceGlassCeiling', 'scurve', 'engageCoef', 'MATURITY_MAP',
] as const;
export type OverridableKey = (typeof OVERRIDABLE_KEYS)[number];

/** Form fields that are never overridden: the horizon is calendar, the hub infrastructure is a portfolio cost. */
export const FORBIDDEN_DOM_IDS: readonly string[] = ['horizon', 'khInfraMonthly'];

/** Sparse overrides: only the keys that differ from the common values exist. `dom` holds per-field differences. */
export interface Overrides extends Partial<Pick<CommonCase, OverridableKey>> {
  dom?: { values?: DomState['values']; checked?: DomState['checked'] };
}

/** Address of one override: a top-level key, or `values.<id>` / `checked.<id>` for one form field. */
export type OverrideRef = OverridableKey | `values.${string}` | `checked.${string}`;

export interface KnowledgeDomain { label: string; weightPct: number }

/** The part of the common Knowledge Hub that serves one product; an absent field is inherited. */
export interface KnowledgeSubset {
  enabled?: boolean;
  domains?: KnowledgeDomain[];
  maturityAnswers?: number[];
  targetCC?: number;
  curationFTE?: number;
  setupBase?: number;
  ktLeadMonths?: number;
}

export interface Product {
  id: string;
  name: string;
  note?: string;
  archived?: boolean;
  teamIn: CaseState['teamIn'];
  knowledge: KnowledgeSubset;
  overrides: Overrides;
  waveId: string | null;
  offsetMonths: number;
}

/** What a wave waits for (see `waveSchedule.ts`): another wave's start, or the end of the setup of that wave's last product. */
export type WaveMilestone = 'start' | 'setupEnd';
export const WAVE_MILESTONES: readonly WaveMilestone[] = ['start', 'setupEnd'];
/** "Starts after wave `waveId` reaches `milestone`, plus `lagMonths`." The effective start is the later of this and the wave's own start. */
export interface WaveDependency { waveId: string; milestone: WaveMilestone; lagMonths: number }

export interface Wave {
  id: string; name: string; note?: string; startMonth: number; productIds: string[];
  /** optional dependency on another wave; absent = the wave starts at its own start month */
  dependsOn?: WaveDependency;
}

export interface HubSettings { enabled: boolean; infraMonthly: number; infraAllocation: 'perProduct' | 'byBaseEtp' }

export interface Portfolio {
  _schema: 'agentcase.portfolio.v1';
  common: CommonCase;
  products: Product[];
  waves: Wave[];
  activeProductId: string;
  hub: HubSettings;
  horizonMonths: number;
  /** ISO date of portfolio month 1; '' when unset */
  startDate: string;
  /** global correlation between products in the portfolio Monte Carlo, 0..1; absent = 0 (independent, D-M7) */
  rho?: number;
  /** transformation-team capacity: at most this many products in setup at the same time (integer >= 1); absent = no limit */
  maxConcurrentSetups?: number;
}
