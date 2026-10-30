/** @calc-zone process-model */
import { CROSS_ID, type CatArtefact, type ProcessCatalogue } from './types';

/** BPMN DI geometry of the generated process (F-B14). Pure numbers; `buildDi` writes them as BPMN DI. */
export interface Box { x: number; y: number; w: number; h: number }
export interface Layout {
  pool: Box; lanes: { teamSkill: string; box: Box }[]; crossLane: Box; midY: number;
  phaseOrder: string[]; phases: Map<string, Box>; tasks: Map<string, Box>;
  start: Box; fork: Box; join: Box; end: Box;
}
const TW = 100, TH = 80, G = 20, POOL_X = 160, POOL_Y = 80, HEAD = 30, PHASE_GAP = 50, FIRST_PAD = 60;

interface Item { id: string; phase: string; lane: string; seq: number; order: number; reg: number }
/** The team skill (lane) of an artefact: the skill map for SDLC artefacts, the artefact's own team skill for regulatory ones. */
export const laneOf = (a: CatArtefact, reg: boolean, map: Record<string, string>): string =>
  reg ? a.teamSkill ?? 'Regulatory Affairs' : map[a.skill] ?? a.skill;
const byPlace = (a: Item, b: Item): number => a.seq - b.seq || a.reg - b.reg || a.order - b.order;

function itemsOf(c: ProcessCatalogue): Item[] {
  const one = (reg: boolean) => (a: CatArtefact, i: number): Item =>
    ({ id: a.id, phase: a.phase, lane: laneOf(a, reg, c.skillMap), seq: a.seq ?? 0, order: i + 1, reg: reg ? 1 : 0 });
  return [...c.sdlc.map(one(false)), ...c.reg.map(one(true))];
}
/** Phases left to right by their sequence (stable on catalogue order). */
export const phaseOrderOf = (c: ProcessCatalogue): string[] =>
  c.phases.map((p, i) => ({ id: p.id, seq: p.seq, i })).sort((a, b) => a.seq - b.seq || a.i - b.i).map((p) => p.id);

/** Lanes: team skills in the vocabulary order, then any other team skill in order of appearance; only those with work outside Cross-cutting. */
function laneList(c: ProcessCatalogue, items: Item[]): string[] {
  const used = [...new Set(items.filter((x) => x.phase !== CROSS_ID).map((x) => x.lane))];
  return [...c.laneOrder.filter((l) => used.includes(l)), ...used.filter((l) => !c.laneOrder.includes(l))];
}

/** The deterministic layout: lanes per team skill, phases as columns left to right, Cross-cutting as a band across the bottom. */
export function layoutOf(c: ProcessCatalogue): Layout {
  const items = itemsOf(c), lanes = laneList(c, items), phaseOrder = phaseOrderOf(c);
  const cell = (p: string, l: string) => items.filter((x) => x.phase === p && x.lane === l).sort(byPlace);
  const cols = new Map(phaseOrder.map((p) => [p, Math.max(1, Math.ceil(Math.sqrt(Math.max(0, ...lanes.map((l) => cell(p, l).length)))))]));
  const rows = lanes.map((l) => Math.max(1, ...phaseOrder.map((p) => Math.ceil(cell(p, l).length / (cols.get(p) ?? 1)))));
  const contentX = POOL_X + 2 * HEAD, lanesTop = POOL_Y, pads = lanes.map((_, i) => (i ? G : FIRST_PAD));
  const laneH = rows.map((r, i) => (pads[i] ?? G) + r * (TH + G));
  const laneY = laneH.map((_, i) => lanesTop + laneH.slice(0, i).reduce((s, h) => s + h, 0));
  const lanesBottom = lanesTop + laneH.reduce((s, h) => s + h, 0), midY = Math.round((lanesTop + lanesBottom) / 2);
  const start: Box = { x: contentX + 10, y: midY - 18, w: 36, h: 36 }, fork: Box = { x: contentX + 80, y: midY - 25, w: 50, h: 50 };
  const phases = new Map<string, Box>(), tasks = new Map<string, Box>();
  let x = contentX + 170;
  for (const p of phaseOrder) {
    const k = cols.get(p) ?? 1, w = k * (TW + G) + G;
    phases.set(p, { x, y: lanesTop + 30, w, h: lanesBottom - lanesTop - 40 });
    lanes.forEach((l, li) => cell(p, l).forEach((t, i) => tasks.set(t.id, {
      x: x + G + (i % k) * (TW + G), y: (laneY[li] ?? 0) + (pads[li] ?? G) + Math.floor(i / k) * (TH + G), w: TW, h: TH })));
    x += w + PHASE_GAP;
  }
  const first = phases.get(phaseOrder[0] ?? '') ?? { x, y: 0, w: 0, h: 0 }, right = x - PHASE_GAP;
  const join: Box = { x: right + 40, y: midY - 25, w: 50, h: 50 }, end: Box = { x: right + 130, y: midY - 18, w: 36, h: 36 };
  const crossItems = items.filter((t) => t.phase === CROSS_ID).sort((a, b) => lanes.indexOf(a.lane) - lanes.indexOf(b.lane) || byPlace(a, b));
  const crossW = right - first.x, perRow = Math.max(1, Math.floor((crossW - G) / (TW + G)));
  const crossRows = Math.max(1, Math.ceil(crossItems.length / perRow)), crossLaneH = 2 * G + 30 + crossRows * (TH + G) + G;
  const cross: Box = { x: first.x, y: lanesBottom + G, w: crossW, h: crossLaneH - 2 * G };
  phases.set(CROSS_ID, cross);
  crossItems.forEach((t, i) => tasks.set(t.id, {
    x: cross.x + G + (i % perRow) * (TW + G), y: cross.y + 30 + G + Math.floor(i / perRow) * (TH + G), w: TW, h: TH }));
  const poolW = end.x + end.w + 40 - POOL_X, laneW = poolW - HEAD;
  return {
    pool: { x: POOL_X, y: POOL_Y, w: poolW, h: lanesBottom + crossLaneH - POOL_Y },
    lanes: lanes.map((l, i) => ({ teamSkill: l, box: { x: POOL_X + HEAD, y: laneY[i] ?? 0, w: laneW, h: laneH[i] ?? 0 } })),
    crossLane: { x: POOL_X + HEAD, y: lanesBottom, w: laneW, h: crossLaneH }, midY, phaseOrder, phases, tasks, start, fork, join, end,
  };
}
