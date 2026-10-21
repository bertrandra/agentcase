import { useMemo } from 'react';
import type { DepEdges, DepGroup, DepSection } from '@/domain/refshare/deps';
import { catalogueOrder, incomingCount, participating, sourceIds, tagMismatch } from '@/domain/refshare/deps';
import { useDoc } from '@/store/hooks';
import { GROUPS, SECTIONS } from '@/ui/zones/registry';

export const ALL_SECTIONS: DepSection[] = SECTIONS;
export const ALL_GROUPS: DepGroup[] = GROUPS;
export const labelOf = (id: string): string => SECTIONS.find((s) => s.id === id)?.label ?? id;
const NO_EDGES: DepEdges = {};

/** The live dependency registry of the case with the derived figures every sub-tab shows. */
export function useDeps() {
  const deps = useDoc((d) => (d.SECTION_DEPS as DepEdges | undefined) ?? NO_EDGES);
  const desc = useDoc((d) => (d.SECTION_DEPS_DESC as Record<string, string> | undefined) ?? {});
  return useMemo(() => {
    const part = participating(deps, ALL_SECTIONS), sources = sourceIds(deps, ALL_SECTIONS, ALL_GROUPS);
    return {
      deps, desc, part, sources,
      edges: Object.keys(deps).reduce((n, s) => n + (ALL_SECTIONS.some((x) => x.id === s) ? Object.keys(deps[s] ?? {}).length : 0), 0),
      mismatches: ALL_SECTIONS.filter((s) => tagMismatch(deps, s)),
      ordered: catalogueOrder(ALL_SECTIONS, ALL_GROUPS),
      incoming: (id: string) => incomingCount(deps, id),
    };
  }, [deps, desc]);
}
export type DepsModel = ReturnType<typeof useDeps>;
