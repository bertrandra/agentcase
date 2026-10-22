/** @calc-zone workspace-config */
/** Section dependency registry (legacy SECTION_DEPS): { source: { target: 'S' strong calculation input | 'I' soft annotation } }. */
export type Strength = 'S' | 'I';
export type DepEdges = Record<string, Record<string, Strength>>;
export interface DepSection { id: string; label: string; group: string; groupSeq: number; tag?: string }
export interface DepGroup { id: string; label: string; order: number }

const groupOrder = (groups: DepGroup[], id: string): number => groups.find((g) => g.id === id)?.order || 99;

/** Catalogue order: menu group order, then position in the group — so the matrix reads in build order. */
export function catalogueOrder<T extends DepSection>(sections: T[], groups: DepGroup[]): T[] {
  return sections.slice().sort((a, b) => groupOrder(groups, a.group) - groupOrder(groups, b.group) || (a.groupSeq || 0) - (b.groupSeq || 0));
}

const outDegree = (deps: DepEdges, id: string): number => Object.keys(deps[id] ?? {}).length;

/** Edges whose two ends are live sections. */
export function liveEdges(deps: DepEdges, sections: DepSection[]): [src: string, tgt: string, level: Strength][] {
  const live = new Set(sections.map((s) => s.id)), out: [string, string, Strength][] = [];
  for (const src of Object.keys(deps)) if (live.has(src)) for (const [tgt, lv] of Object.entries(deps[src] ?? {})) if (live.has(tgt)) out.push([src, tgt, lv]);
  return out;
}

/** A section participates when it has an outgoing edge or is the target of one. */
export function participating(deps: DepEdges, sections: DepSection[]): Set<string> {
  const live = new Set(sections.map((s) => s.id)), part = new Set<string>();
  for (const src of Object.keys(deps)) {
    if (!live.has(src)) continue;
    if (outDegree(deps, src)) part.add(src);
    for (const t of Object.keys(deps[src] ?? {})) if (live.has(t)) part.add(t);
  }
  return part;
}

/** Catalogue sections that carry at least one outgoing edge, in build order. */
export const sourceIds = (deps: DepEdges, sections: DepSection[], groups: DepGroup[]): string[] =>
  catalogueOrder(sections.filter((s) => outDegree(deps, s.id) > 0), groups).map((s) => s.id);

export const incomingCount = (deps: DepEdges, id: string): number => Object.values(deps).filter((e) => e && e[id]).length;

/** CC-DEP-02 (forward direction only): a section tagged `drives` with no outgoing edge is unambiguously wrong. */
export const tagMismatch = (deps: DepEdges, s: DepSection): string =>
  String(s.tag ?? '').includes('drives') && outDegree(deps, s.id) === 0 ? 'tagged drives but has no outgoing edge' : '';

/** Integrity pass: drop every edge whose source or target is no longer a live section (legacy pruneSectionDeps). */
export function pruneDeps(deps: DepEdges, desc: Record<string, string>, sections: DepSection[]): { deps: DepEdges; desc: Record<string, string>; dropped: string[] } {
  const live = new Set(sections.map((s) => s.id)), dropped: string[] = [], nd: DepEdges = {}, ndesc = { ...desc };
  for (const src of Object.keys(deps)) {
    if (!live.has(src)) { dropped.push(`${src} (source)`); delete ndesc[src]; continue; }
    nd[src] = {};
    for (const [t, lv] of Object.entries(deps[src] ?? {})) if (live.has(t)) nd[src][t] = lv; else dropped.push(`${src} → ${t}`);
  }
  return { deps: nd, desc: ndesc, dropped };
}

export interface Lane { id: string; label: string; ids: string[] }
export interface GraphLayout { width: number; height: number; lanes: Lane[]; pos: Record<string, { x: number; y: number }>; nodeW: number; nodeH: number; colW: number }

/** Staged-flow layout of the graph: one lane per menu group (in group order), participating nodes stacked and centred in their lane. */
export function graphLayout(deps: DepEdges, sections: DepSection[], groups: DepGroup[]): GraphLayout {
  const part = participating(deps, sections), colW = 186, rowH = 52, nodeW = 140, nodeH = 30, mX = 14, mTop = 46;
  const byId = new Map(sections.map((s) => [s.id, s]));
  const lanes: Lane[] = [];
  for (const id of part) {
    const g = byId.get(id)!.group;
    let lane = lanes.find((l) => l.id === g);
    if (!lane) lanes.push((lane = { id: g, label: groups.find((x) => x.id === g)?.label ?? g, ids: [] }));
    lane.ids.push(id);
  }
  lanes.sort((a, b) => groupOrder(groups, a.id) - groupOrder(groups, b.id));
  lanes.forEach((l) => l.ids.sort((a, b) => (byId.get(a)!.groupSeq || 0) - (byId.get(b)!.groupSeq || 0)));
  const maxRows = Math.max(0, ...lanes.map((l) => l.ids.length)), pos: GraphLayout['pos'] = {};
  lanes.forEach((lane, si) => {
    const y0 = mTop + ((maxRows - lane.ids.length) * rowH) / 2;
    lane.ids.forEach((id, ri) => { pos[id] = { x: mX + si * colW + (colW - nodeW) / 2, y: y0 + ri * rowH }; });
  });
  return { width: lanes.length * colW + mX * 2, height: maxRows * rowH + mTop + 26, lanes, pos, nodeW, nodeH, colW };
}
