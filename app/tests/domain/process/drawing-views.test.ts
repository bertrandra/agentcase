import { describe, expect, it } from 'vitest';
import { drawingOf, drawingView, readProcess, roleLanes, type Drawing } from '@/domain/process';
import { opened } from '../../helpers/processCases';

/** Points of view of the diagram (owner's request 2026-11-04): with automation (the document's diagram), process only (no agents' lane). */
const golden = () => { const doc = opened('golden').BPMN as never; return { doc, d: drawingOf(doc), lanes: roleLanes(doc) }; };
const inside = (a: { y: number; h: number }, l: { y: number; h: number }) => a.y >= l.y && a.y + a.h <= l.y + l.h;

describe('drawingView', () => {
  it('"automation" is the document\'s drawing, unchanged', () => {
    const { d, lanes } = golden();
    expect(drawingView(d, 'automation', lanes)).toBe(d);
  });
  it('"process": no agents\' lane, every activity in the lane of its role, same phase column, no overlap; flows kept', () => {
    const { doc, d, lanes } = golden(), v: Drawing = drawingView(d, 'process', lanes), acts = v.shapes.filter((s) => s.kind === 'activity');
    const laneShapes = v.shapes.filter((s) => s.kind === 'lane');
    expect(laneShapes.some((l) => /agent/i.test(l.label))).toBe(false);
    expect(acts.map((s) => s.id).sort()).toEqual(d.shapes.filter((s) => s.kind === 'activity').map((s) => s.id).sort());
    const agentActs = readProcess(doc).activities.filter((a) => a.type === 'Agent').map((a) => a.id);
    expect(agentActs.length).toBeGreaterThan(10);
    for (const id of agentActs) {
      const s = acts.find((x) => x.id === id)!, before = d.shapes.find((x) => x.id === id)!, lane = laneShapes.find((l) => l.label === lanes.get(id));
      if (!lane) continue;   // an agent activity drawn outside the agents' lane (Cross-cutting) keeps its place
      if (/agent/i.test(d.shapes.find((l) => l.kind === 'lane' && before.y >= l.y && before.y < l.y + l.h)?.label ?? '')) expect(inside(s, lane)).toBe(true);
      const box = v.shapes.find((p) => p.kind === 'phase' && p.id === s.phase);   // still inside its own phase
      if (box) expect(s.x >= box.x && s.x + s.w <= box.x + box.w && s.y >= box.y && s.y + s.h <= box.y + box.h).toBe(true);
    }
    for (const a of acts) for (const b of acts) if (a !== b) expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
    for (const a of acts) expect(laneShapes.some((l) => inside(a, l))).toBe(true);
    expect(v.edges.map((e) => e.id)).toEqual(d.edges.map((e) => e.id));
  });
  it('a drawing without an agents\' lane, or with an agent activity whose role has no lane, is unchanged', () => {
    const { d } = golden();
    expect(drawingView(d, 'process', new Map())).toBe(d);
    const noAgents: Drawing = { ...d, shapes: d.shapes.filter((s) => !(s.kind === 'lane' && /agent/i.test(s.label))) };
    expect(drawingView(noAgents, 'process', golden().lanes)).toBe(noAgents);
  });
});
