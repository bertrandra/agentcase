import raw from '@/generated/dependencies.json';
import { FIGURES, ZONES, type ZoneDef } from '@/domain/zones';
import config from '@/domain/zones/graphConfig.json';
import { plan, type SelectionConfig } from '@/domain/zones/selection';
import { buildLayers, consumersOf, cycles, impact, indirectZones, type DepEdge, type DepsData } from '@/domain/zones/graph';

/** The generated graph (`npm run deps:gen`), typed. Everything below is derived from it and from the zone catalogue: nothing is authored here. */
export const DATA = raw as unknown as DepsData;
export const DRAWN: ZoneDef[] = ZONES.filter((z) => z.lane !== 'shared');
export const SHARED: ZoneDef[] = ZONES.filter((z) => z.lane === 'shared');
const drawnIds = DRAWN.map((z) => z.id);
const lanes = Object.fromEntries(ZONES.map((z) => [z.id, z.lane]));
export const LAYERS = buildLayers(drawnIds, DATA.edges, lanes);
export const CYCLES = cycles(drawnIds, DATA.edges);
export const zoneOf = (id: string): ZoneDef | undefined => ZONES.find((z) => z.id === id);
export const sectionOf = (id: string): DepsData['sections'][number] | undefined => DATA.sections.find((s) => s.id === id);
export const labelOf = (id: string): string => zoneOf(id)?.label ?? sectionOf(id)?.label ?? id;
export const isZone = (id: string): boolean => drawnIds.includes(id);
/** Reference sections (kind S-static) show no calculation: they are collapsed into one counted lane of the graph. */
export const isReference = (id: string): boolean => sectionOf(id)?.kind === 'S-static';
export const edgesOf = (id: string): { out: DepEdge[]; in: DepEdge[] } => ({ out: DATA.edges.filter((e) => e[0] === id), in: DATA.edges.filter((e) => e[1] === id) });

export interface Selection { upstream: Set<string>; downstream: Set<string>; impacted: ReturnType<typeof impact> }
/** Nodes reachable along the flow (dir 0 = downstream, 1 = upstream). A section other than the start is a terminal node: it shows values, it relays none. */
function sweep(id: string, dir: 0 | 1): Set<string> {
  const seen = new Set<string>([id]), q = [id];
  while (q.length) {
    const cur = q.pop()!;
    if (cur !== id && !isZone(cur)) continue;
    for (const e of DATA.edges) { const next = dir === 0 ? e[1] : e[0]; if (e[dir] === cur && !seen.has(next)) { seen.add(next); q.push(next); } }
  }
  return seen;
}
/** What a node touches: both directions of the flow and the impact (sections and tests) if it changes. */
export function select(id: string): Selection {
  const zone = isZone(id);
  return { upstream: sweep(id, 1), downstream: sweep(id, 0), impacted: impact(DATA, zone ? [id] : [], zone ? [] : [id]) };
}

/**
 * Matrix cell between a row node and a zone column: `direct` (imported), `write` (input section through a controller), `indirect` (only through other
 * zones).
 */
export type Cell = 'direct' | 'write' | 'indirect' | null;
export function cell(row: string, col: string): Cell {
  if (row === col) return null;
  if (isZone(row)) {
    if (DATA.edges.some((e) => e[2] === 'z' && e[0] === col && e[1] === row)) return 'direct';
    return LAYERS.order.includes(col) && reaches(col, row) ? 'indirect' : null;
  }
  if (DATA.edges.some((e) => e[2] === 'w' && e[0] === row && e[1] === col)) return 'write';
  if (DATA.edges.some((e) => e[2] === 'r' && e[0] === col && e[1] === row)) return 'direct';
  return indirectZones(DATA, row).includes(col) ? 'indirect' : null;
}
const reaches = (from: string, to: string): boolean => sweep(from, 0).has(to);
export const figuresOf = (zone: string) => FIGURES.filter((f) => f.zone === zone).map((f) => ({ ...f, owner: DATA.figures.find((x) => x.id === f.id)?.owner ?? '', consumers: consumersOf(DATA, f.id) }));

/** The rule (docs/TEST_SELECTION.md) and its outcome for a change in a zone or a section. */
export const RULE = config.selection as SelectionConfig;
export const planFor = (id: string) => (isZone(id) ? plan(DATA, RULE, [id], []) : plan(DATA, RULE, [], [id]));
