import { useMemo } from 'react';
import {
  commonSubsetValue, infraView, knowledgeTable, validate, waveEffects, type HubSettings, type InfraView, type Issue, type KnowledgeTable, type SubsetField, type WaveEffect,
} from '@/domain/portfolio';
import { usePortfolio } from './hooks';
import { useActiveProduct, useCommon, useIsMulti } from './portfolioHooks';

/** The shared Knowledge Hub settings (a stable reference until they change). */
export const useHub = (): HubSettings => usePortfolio((p) => p.hub);

/** Diagnostics the Knowledge transfer table raises (hub used by no product, unplanned product, capped target, capped preparation). */
const KT_CODES = ['hub-unused', 'unscheduled', 'target-capped', 'kt-lead-clamped'];

export interface KnowledgeView { table: KnowledgeTable; waves: WaveEffect[]; infra: InfraView; diagnostics: Issue[] }

/** Everything the Knowledge transfer section shows: the F29 table, the F31 hub effect by wave, the infra allocation check and the diagnostics. */
export function useKnowledgeView(): KnowledgeView {
  const pf = usePortfolio((p) => p);
  return useMemo(() => {
    const table = knowledgeTable(pf);
    return { table, waves: waveEffects(pf, table.rows), infra: infraView(pf, table.rows), diagnostics: validate(pf).diagnostics.filter((d) => KT_CODES.includes(d.code)) };
  }, [pf]);
}

/** Inherited / own state of one field of the ACTIVE product's knowledge subset (the subset holds a field only when the product has its own). */
export interface SubsetState { multi: boolean; productId: string; productName: string; own: boolean; common: unknown }
export function useSubsetField(field: SubsetField): SubsetState {
  const multi = useIsMulti(), prod = useActiveProduct(), common = useCommon();
  return useMemo(() => ({ multi, productId: prod.id, productName: prod.name, own: prod.knowledge[field] !== undefined, common: commonSubsetValue(common, field) }), [multi, prod, common, field]);
}
