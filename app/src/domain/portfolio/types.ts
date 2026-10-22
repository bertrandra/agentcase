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

export interface Wave { id: string; name: string; note?: string; startMonth: number; productIds: string[] }

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
}
