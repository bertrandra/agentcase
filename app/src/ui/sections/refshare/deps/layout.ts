import { DATA, DRAWN, LAYERS, isReference } from './model';

export interface Pos { x: number; y: number; lane: number }
export interface Lane { id: string; label: string; count: number }
export interface Layout { width: number; height: number; lanes: Lane[]; pos: Record<string, Pos>; nodeW: number; nodeH: number; colW: number;
  reference: string[] }

const NODE_W = 148, NODE_H = 24, COL_W = 176, ROW_H = 32, M_X = 14, M_TOP = 46, SPLIT = 26;

/**
 * Staged lanes like the legacy graph: input sections, then the zones by role (inputs, calculation, results), then the result sections in two columns.
 * Reference sections (kind S-static) are not placed: they form the counted "no calculation" lane. Order inside a lane is the build order / menu order.
 */
export function layoutGraph(): Layout {
  const secs = DATA.sections.filter((s) => !isReference(s.id));
  const zonesBy = (lane: string): string[] => LAYERS.order.filter((id) => DRAWN.find((z) => z.id === id)?.lane === lane);
  const inputs = secs.filter((s) => s.kind === 'I-input').map((s) => s.id), results = secs.filter((s) => s.kind !== 'I-input').map((s) => s.id);
  const half = Math.min(SPLIT, Math.ceil(results.length / 2));
  const cols: Lane[] = [], ids: string[][] = [];
  const add = (id: string, label: string, list: string[]): void => { if (list.length) { cols.push({ id, label, count: list.length }); ids.push(list); } };
  add('in-sections', 'Input sections', inputs);
  add('in-zones', 'Input zones', zonesBy('input'));
  add('calc-zones', 'Calculation zones', zonesBy('calc'));
  add('out-zones', 'Result zones', zonesBy('result'));
  add('out-sections', 'Result sections', results.slice(0, half));
  add('out-sections-2', 'Result sections, cont.', results.slice(half));
  const rows = Math.max(...ids.map((l) => l.length)), pos: Record<string, Pos> = {};
  ids.forEach((list, lane) => list.forEach((id, i) => {
    pos[id] = { x: M_X + lane * COL_W + (COL_W - NODE_W) / 2, y: M_TOP + ((rows - list.length) * ROW_H) / 2 + i * ROW_H, lane };
  }));
  const reference = DATA.sections.filter((s) => isReference(s.id)).map((s) => s.id);
  cols.push({ id: 'reference', label: 'No calculation', count: reference.length });
  return { width: cols.length * COL_W + M_X * 2, height: rows * ROW_H + M_TOP + 20, lanes: cols, pos, nodeW: NODE_W, nodeH: NODE_H, colW: COL_W, reference };
}
