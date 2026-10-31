/** @calc-zone exports */
import type { DrawEdge, Drawing, DrawShape } from '../process/drawing';
import type { ProgrammeView } from './model';

/**
 * The diagram of the transformation programme (F-B70; phase B9a): a pool with a swim lane per role (the agents in their own lane), the phases
 * as sub-processes across the lanes, each activity in its lane and phase, the waves as sub-processes in a band under the lanes, the sequence of
 * the engagement stages, and the message flows to the delivery process drawn up out of the pool. Deterministic; the same shapes as the delivery
 * drawing (`Drawing`), so one SVG component draws both. Also the BPMN DI of the programme's export.
 */
const TW = 120, TH = 64, G = 16, HEAD = 30, PHASE_HEAD = 28, ABOVE = 40, MS = 40;
/** A shape of the programme: an activity (task), a gateway (maturity gate) or a milestone (event). */
interface Item { id: string; name: string; phase: string; lane: string; active: boolean; instances: number | null; shape: 'activity' | 'gateway' | 'event' }

export function programmeDrawing(v: ProgrammeView): Drawing {
  const shapes: DrawShape[] = [], edges: DrawEdge[] = [];
  const items: Item[] = [...v.activities.map((a) => ({ ...a, shape: 'activity' as const })),
    ...v.milestones.map((m) => ({ id: m.id, name: m.name, phase: m.phase, lane: m.lane, active: true, instances: m.instances,
      shape: m.element === 'gateway' ? 'gateway' as const : 'event' as const }))];
  const cell = (ph: string, lane: string) => items.filter((a) => `prog-phase-${a.phase}` === ph && `prog-lane-${a.lane}` === lane);
  const widths = v.phases.map((p) => G + Math.max(1, ...v.lanes.map((l) => cell(p.id, l.id).length)) * (TW + G));
  const laneH = PHASE_HEAD + TH + 2 * G, x0 = 2 * HEAD, lanesH = v.lanes.length * laneH, waveH = v.waves.length ? TH + 2 * G + PHASE_HEAD : 0;
  const totalW = widths.reduce((s, w) => s + w + G, G);
  shapes.push({ id: v.participant.id, kind: 'pool', x: 0, y: 0, w: x0 + totalW, h: lanesH + waveH, label: v.participant.name });
  v.lanes.forEach((l, i) => shapes.push({ id: l.id, kind: 'lane', x: HEAD, y: i * laneH, w: HEAD + totalW, h: laneH, label: l.name }));
  let x = x0 + G;
  v.phases.forEach((p, pi) => {
    shapes.push({ id: p.id, kind: 'phase', x, y: 4, w: widths[pi]!, h: lanesH - 8, label: p.name });
    v.lanes.forEach((l, li) => cell(p.id, l.id).forEach((a, k) => {
      const y = li * laneH + PHASE_HEAD + G, x0k = x + G + k * (TW + G), small = a.shape !== 'activity', d = small ? (TH - MS) / 2 : 0;
      shapes.push({ id: a.id, kind: a.shape, x: x0k + d + (small ? (TW - TH) / 2 : 0), y: y + d, w: small ? MS : TW, h: small ? MS : TH, label: a.name,
        inScope: a.active, phase: p.id, ...(a.instances !== null && !small ? { marker: v.waves.length ? `× ${a.instances} products` : '×' } : {}) });
    }));
    x += widths[pi]! + G;
  });
  v.waves.forEach((w, i) => shapes.push({ id: w.id, kind: 'phase', x: x0 + G + i * (TW * 1.6 + G), y: lanesH + G / 2, w: TW * 1.6, h: TH + PHASE_HEAD,
    label: w.name, marker: `${w.products.length} products · month ${w.start}` }));
  const at = new Map(shapes.map((s) => [s.id, s])), mid = (s: DrawShape): [number, number] => [s.x + s.w / 2, s.y + s.h / 2];
  const stages = v.activities.filter((a) => a.phase === 'engagement').map((a) => at.get(a.id)!).filter(Boolean);
  stages.slice(1).forEach((b, i) => {
    const a = stages[i]!, [, ay] = mid(a), [, by] = mid(b), xm = (a.x + a.w + b.x) / 2;
    edges.push({ id: `prog-flow-${i + 1}`, points: [[a.x + a.w, ay], [xm, ay], [xm, by], [b.x, by]], rework: false });
  });
  v.messageFlows.forEach((f) => {
    const s = at.get(f.source);
    if (s) edges.push({ id: f.id, points: [[s.x + s.w / 2, s.y], [s.x + s.w / 2, -ABOVE]], rework: false, message: true });
  });
  const h = lanesH + waveH;
  return { box: { x: -G, y: -ABOVE - G, w: x0 + totalW + 2 * G, h: h + ABOVE + 2 * G }, shapes, edges };
}
