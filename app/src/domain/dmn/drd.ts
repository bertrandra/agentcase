/** @calc-zone process-model */
import type { DmnModel } from './types';

/**
 * The decision requirements diagram of a DMN model (SPEC_FIXES FX-26 follow-up; DMN 1.3 § 6 DRD): input data on the bottom row, each decision on
 * the row above everything it requires, an arrow per information requirement. A layout only — the same graph the exported `.dmn` file's DMNDI
 * describes, drawn in the app; it reads no value and moves no figure.
 */
export interface DrdNode { id: string; name: string; question?: string; kind: 'decision' | 'input'; x: number; y: number; w: number; h: number }
export interface DrdEdge { from: string; to: string }
export interface Drd { nodes: DrdNode[]; edges: DrdEdge[]; width: number; height: number }
const W = 190, H = 64, GX = 40, GY = 56, PAD = 16;

export function drdLayout(m: DmnModel): Drd {
  const depth = new Map<string, number>(m.inputs.map((i) => [i.id, 0])), byId = new Map(m.decisions.map((d) => [d.id, d]));
  const depthOf = (id: string, seen = new Set<string>()): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    const d = byId.get(id);
    if (!d || seen.has(id)) return 1;   // an unknown reference or a cycle (refused on import) lands on the first decision row
    seen.add(id);
    const v = 1 + Math.max(0, ...d.requiredDecisions.map((r) => depthOf(r, seen)), ...d.requiredInputs.map(() => 0));
    depth.set(id, v);
    return v;
  };
  m.decisions.forEach((d) => depthOf(d.id));
  const top = Math.max(1, ...depth.values()), rows = new Map<number, string[]>();
  for (const [id, k] of depth) rows.set(k, [...(rows.get(k) ?? []), id]);
  const widest = Math.max(...[...rows.values()].map((r) => r.length)), width = PAD * 2 + widest * W + (widest - 1) * GX;
  const nodes: DrdNode[] = [];
  for (const [k, ids] of rows) {
    const rowW = ids.length * W + (ids.length - 1) * GX, x0 = (width - rowW) / 2, y = PAD + (top - k) * (H + GY);
    ids.forEach((id, i) => {
      const d = byId.get(id), inp = m.inputs.find((x) => x.id === id);
      nodes.push({ id, name: d?.name ?? inp?.name ?? id, ...(d?.question ? { question: d.question } : {}), kind: d ? 'decision' : 'input',
        x: x0 + i * (W + GX), y, w: W, h: H });
    });
  }
  const edges = m.decisions.flatMap((d) => [...d.requiredDecisions, ...d.requiredInputs].filter((r) => depth.has(r)).map((r) => ({ from: r, to: d.id })));
  return { nodes, edges, width, height: PAD * 2 + (top + 1) * H + top * GY };
}
