/** @calc-zone foundation */
import type { HubSettings, KnowledgeSubset, Portfolio, Product, SharedTeamLine, Wave, WaveDependency } from './types';

/**
 * The runtime twin of an interface: every field of `T`, marked required or optional. Typed as a mapped type, so a field added to (or removed from)
 * the interface without the same change here, or a field whose optionality changes, fails `tsc`. The 🗄️ Data Model section reads these lists.
 */
export type FieldSet<T> = { readonly [K in keyof T]-?: object extends Pick<T, K> ? 'optional' : 'required' };

export const PORTFOLIO_FIELDS: FieldSet<Portfolio> = {
  _schema: 'required', common: 'required', products: 'required', waves: 'required', activeProductId: 'required', hub: 'required',
  horizonMonths: 'required', startDate: 'required', rho: 'optional', maxConcurrentSetups: 'optional',
};

export const PRODUCT_FIELDS: FieldSet<Product> = {
  id: 'required', name: 'required', note: 'optional', archived: 'optional', knowledge: 'required', overrides: 'required',
  waveId: 'required', offsetMonths: 'required',
};

export const WAVE_FIELDS: FieldSet<Wave> = {
  id: 'required', name: 'required', note: 'optional', startMonth: 'required', productIds: 'required', dependsOn: 'optional',
};

export const WAVE_DEPENDENCY_FIELDS: FieldSet<WaveDependency> = { waveId: 'required', milestone: 'required', lagMonths: 'required' };

export const SHARED_TEAM_LINE_FIELDS: FieldSet<SharedTeamLine> = {
  id: 'required', skill: 'required', grade: 'required', loc: 'required', etp: 'required', allocations: 'required', pins: 'optional',
};

export const HUB_FIELDS: FieldSet<HubSettings> = { enabled: 'required', infraMonthly: 'required', infraAllocation: 'required' };

export const KNOWLEDGE_SUBSET_FIELDS: FieldSet<KnowledgeSubset> = {
  enabled: 'optional', domains: 'optional', maturityAnswers: 'optional', targetCC: 'optional', curationFTE: 'optional', setupBase: 'optional',
  ktLeadMonths: 'optional',
};
