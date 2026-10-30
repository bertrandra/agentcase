import { describe, expect, it } from 'vitest';
import { PHASES } from '@/domain/catalog';
import { catalogueProcess, readProcess, TODAYS_CATALOGUE } from '@/domain/process';
import { laneOf, layoutOf, type Box } from '@/domain/process/layout';

/** F-B14: the generated diagram is deterministic, lanes per team skill, phases left to right, Cross-cutting as a band across the bottom. */
const L = layoutOf(TODAYS_CATALOGUE), v = readProcess(catalogueProcess());
const inside = (a: Box, b: Box): boolean => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const overlap = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('generated diagram (BPMN DI)', () => {
  it('is deterministic', () => expect(layoutOf(TODAYS_CATALOGUE)).toEqual(L));
  it('puts phases left to right in sequence order, every one inside the pool, Cross-cutting below all lanes', () => {
    expect(L.phaseOrder).toEqual([...PHASES].sort((a, b) => a.seq - b.seq).map((p) => p.id));
    const xs = L.phaseOrder.map((p) => L.phases.get(p) as Box);
    xs.slice(1).forEach((b, i) => expect(b.x).toBeGreaterThan((xs[i] as Box).x + (xs[i] as Box).w));
    const cross = L.phases.get('Cross-cutting') as Box, lastLane = L.lanes[L.lanes.length - 1]?.box as Box;
    expect(cross.y).toBeGreaterThanOrEqual(lastLane.y + lastLane.h);
    for (const b of [...L.phases.values(), ...L.lanes.map((l) => l.box), L.crossLane]) expect(inside(b, L.pool)).toBe(true);
  });
  it('stacks one lane per team skill, contiguous, in the vocabulary order', () => {
    expect(L.lanes.map((l) => l.teamSkill)).toEqual(TODAYS_CATALOGUE.laneOrder.filter((s) => L.lanes.some((l) => l.teamSkill === s)));
    L.lanes.slice(1).forEach((l, i) => { const p = (L.lanes[i] as { box: Box }).box; expect(l.box.y).toBe(p.y + p.h); });
  });
  it('places every activity once, inside its phase and in its team-skill lane, with no two activities overlapping', () => {
    const all = [...TODAYS_CATALOGUE.sdlc.map((a) => ({ a, reg: false })), ...TODAYS_CATALOGUE.reg.map((a) => ({ a, reg: true }))];
    expect(L.tasks.size).toBe(all.length);
    for (const { a, reg } of all) {
      const b = L.tasks.get(a.id) as Box;
      expect(inside(b, L.phases.get(a.phase) as Box), a.id).toBe(true);
      const lane = L.lanes.find((l) => l.teamSkill === laneOf(a, reg, TODAYS_CATALOGUE.skillMap))?.box as Box;
      if (a.phase !== 'Cross-cutting') expect(inside(b, lane), a.id).toBe(true);
    }
    const boxes = [...L.tasks.values()].sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length && (boxes[j] as Box).x < (boxes[i] as Box).x + 100; j++) {
      expect(overlap(boxes[i] as Box, boxes[j] as Box)).toBe(false);
    }
  });
  it('the document carries a shape for every flow node and lane, and an edge with waypoints for every sequence flow', () => {
    const shaped = new Set(v.diagram.shapes.map((s) => s.element)), edged = new Set(v.diagram.edges.map((e) => e.element));
    const nodes = [...v.activities.map((a) => a.id), ...v.phases.map((p) => p.id), 'Start', 'Fork', 'Join', 'End', 'Participant'];
    for (const id of nodes) expect(shaped.has(id), id).toBe(true);
    for (const f of v.flows) expect(edged.has(f.id), f.id).toBe(true);
    expect(v.diagram.edges.every((e) => e.points.length >= 2)).toBe(true);
    expect(v.diagram.shapes.filter((s) => s.expanded).map((s) => s.element)).toEqual([...L.phaseOrder, 'Cross-cutting']);
  });
});
