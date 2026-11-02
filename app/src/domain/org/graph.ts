/** @calc-zone process-model */
import type { OrgModel } from './types';

/**
 * The organisation as a graph (owner's request 2026-11-02, 🏢 Organisation › canvas): the units as a tree of any depth, top-down, each unit's teams
 * as leaves under it. A tidy layout: every leaf gets its own column, a parent sits centred over its children; deterministic. Pure: nothing stored.
 */
export interface OrgNode { id: string; kind: 'unit' | 'team'; label: string; sub: string; x: number; y: number; w: number; h: number; depth: number }
export interface OrgEdge { from: string; to: string; points: [number, number][] }
export interface OrgGraph { nodes: OrgNode[]; edges: OrgEdge[]; box: { x: number; y: number; w: number; h: number } }

export const NODE_W = 160, NODE_H = 56, GAP_X = 24, GAP_Y = 56, PAD = 20;

export function orgGraph(m: Pick<OrgModel, 'units' | 'teams'>, typeLabel: (t: string) => string = (t) => t): OrgGraph {
  const ids = new Set(m.units.map((u) => u.id));
  const kids = new Map<string, string[]>(), roots: string[] = [];
  for (const u of m.units) {
    if (u.parent && ids.has(u.parent) && u.parent !== u.id) (kids.get(u.parent) ?? kids.set(u.parent, []).get(u.parent))?.push(u.id);
    else roots.push(u.id);
  }
  const teamsOf = new Map<string, OrgModel['teams']>();
  for (const t of m.teams) (teamsOf.get(t.unit) ?? teamsOf.set(t.unit, []).get(t.unit))?.push(t);
  const unit = new Map(m.units.map((u) => [u.id, u])), nodes: OrgNode[] = [], edges: OrgEdge[] = [], seen = new Set<string>();
  let col = 0;
  const place = (id: string, depth: number): OrgNode => {
    seen.add(id);
    const u = unit.get(id)!, below: OrgNode[] = [];
    for (const c of kids.get(id) ?? []) if (!seen.has(c)) below.push(place(c, depth + 1));
    for (const t of teamsOf.get(id) ?? []) {
      const n: OrgNode = { id: `team:${t.id}`, kind: 'team', label: t.name, sub: `${t.lines.reduce((s, l) => s + (l.etp || 0), 0)} FTE`,
        x: PAD + col++ * (NODE_W + GAP_X), y: PAD + (depth + 1) * (NODE_H + GAP_Y), w: NODE_W, h: NODE_H, depth: depth + 1 };
      nodes.push(n); below.push(n);
    }
    const x = below.length ? (below[0]!.x + below[below.length - 1]!.x) / 2 : PAD + col++ * (NODE_W + GAP_X);
    const n: OrgNode = { id, kind: 'unit', label: u.name, sub: typeLabel(u.type), x, y: PAD + depth * (NODE_H + GAP_Y), w: NODE_W, h: NODE_H, depth };
    nodes.push(n);
    for (const b of below) {
      const sx = n.x + NODE_W / 2, sy = n.y + NODE_H, tx = b.x + NODE_W / 2, ty = b.y, my = sy + GAP_Y / 2;
      edges.push({ from: id, to: b.id, points: [[sx, sy], [sx, my], [tx, my], [tx, ty]] });
    }
    return n;
  };
  for (const r of roots) place(r, 0);
  for (const u of m.units) if (!seen.has(u.id)) place(u.id, 0);   // a parent cycle: drawn as its own tree
  const w = Math.max(...nodes.map((n) => n.x + n.w), PAD) + PAD, h = Math.max(...nodes.map((n) => n.y + n.h), PAD) + PAD;
  return { nodes, edges, box: { x: 0, y: 0, w, h } };
}
