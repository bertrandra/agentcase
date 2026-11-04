import { describe, expect, it } from 'vitest';
import { addActivityAt, changeActivityRole, drawingOf, placeActivity, readProcess, roleOfLane, type XDocument } from '@/domain/process';
import { opened } from '../../helpers/processCases';

/** The canvas edits (owner's request 2026-11-04): an activity dropped in a cell (phase × lane), its role chosen, an activity added with "+". */
const golden = (): XDocument => opened('golden').BPMN as never;
const act = (d: XDocument, id: string) => readProcess(d).activities.find((a) => a.id === id)!;
const shape = (d: XDocument, id: string) => drawingOf(d).shapes.find((s) => s.id === id)!;
const lane = (d: XDocument, label: string) => drawingOf(d).shapes.find((s) => s.kind === 'lane' && s.label === label)!;
const inside = (s: { x: number; y: number; w: number; h: number }, c: { x: number; y: number; w: number; h: number }) =>
  s.x >= c.x && s.x + s.w <= c.x + c.w && s.y >= c.y && s.y + s.h <= c.y + c.h;
const noOverlap = (d: XDocument) => {
  const acts = drawingOf(d).shapes.filter((s) => s.kind === 'activity');
  for (const a of acts) for (const b of acts) if (a !== b) expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
};

describe('placeActivity', () => {
  it('a lane is its team skill\'s role: the role named like it, else the first of the team', () => {
    expect(roleOfLane(golden(), 'Dev')).toBe('role-dev');
    expect(roleOfLane(golden(), 'Arch/Design')).toBe('role-arch');
    expect(roleOfLane(golden(), 'Agents')).toBeUndefined();
  });
  it('to another lane of the same phase: the lane\'s role, the shape in that cell, no overlap', () => {
    const d = golden(), a = act(d, 'A003'), out = placeActivity(d, 'A003', a.phase, 'Dev');
    expect(act(out, 'A003').humanPerformer).toBe('role-dev');
    expect(act(out, 'A003').phase).toBe(a.phase);
    expect(inside(shape(out, 'A003'), lane(out, 'Dev'))).toBe(true);
    expect(inside(shape(out, 'A003'), shape(out, a.phase))).toBe(true);
    noOverlap(out);
  });
  it('to another phase and lane in one step; a full lane grows and what is below moves down', () => {
    const d = golden(), phases = readProcess(d).phases.filter((p) => p.id !== 'Cross-cutting');
    const ids = readProcess(d).activities.filter((a) => a.phase !== phases[2]!.id && !a.regulatory && a.type !== 'Agent'
      && !readProcess(d).flows.some((f) => f.rework?.activityA === a.id || f.rework?.activityB === a.id)).slice(0, 9).map((a) => a.id);
    let out = d;
    for (const id of ids) out = placeActivity(out, id, phases[2]!.id, 'Lead');
    for (const id of ids) {
      expect(act(out, id).phase).toBe(phases[2]!.id);
      expect(inside(shape(out, id), lane(out, 'Lead'))).toBe(true);
      expect(inside(shape(out, id), shape(out, phases[2]!.id))).toBe(true);
    }
    expect(lane(out, 'Lead').h).toBeGreaterThan(lane(d, 'Lead').h);
    expect(lane(out, 'Ops/Run').y).toBe(lane(d, 'Ops/Run').y);
    expect(lane(out, 'Functional Safety').y).toBe(lane(d, 'Functional Safety').y + lane(out, 'Lead').h - lane(d, 'Lead').h);
    noOverlap(out);
  });
  it('the same cell, an unknown activity or phase: the same document', () => {
    const d = golden(), a = act(d, 'A003'), skill = 'Arch/Design';
    expect(placeActivity(d, 'A003', a.phase, skill)).toBe(d);
    expect(placeActivity(d, 'nope', a.phase, skill)).toBe(d);
    expect(placeActivity(d, 'A003', 'nope', skill)).toBe(d);
  });
  it('a role chosen in the panel moves the shape to that role\'s lane', () => {
    const d = golden(), out = changeActivityRole(d, 'A003', 'role-qa');
    expect(act(out, 'A003').humanPerformer).toBe('role-qa');
    expect(inside(shape(out, 'A003'), lane(out, 'Test/QA'))).toBe(true);
    expect(changeActivityRole(d, 'A003', 'agent-coding')).toBe(d);
  });
  it('"+": a new activity in its phase and its lane', () => {
    const d = golden(), ph = act(d, 'A003').phase;
    const out = addActivityAt(d, { id: 'N1', name: 'New activity', phase: ph, skill: 'Dev', agentActivityType: 'Human', effort: 1 } as never, 'Ops/Run');
    expect(act(out, 'N1').phase).toBe(ph);
    expect(inside(shape(out, 'N1'), lane(out, 'Ops/Run'))).toBe(true);
    expect(shape(out, 'N1').placed).toBeFalsy();
    noOverlap(out);
  });
});

describe('placeActivity and the agents\' lane', () => {
  it('an agent\'s activity in the agents\' lane stays there when its role changes; a person\'s activity is never put there', () => {
    const d = golden(), v = readProcess(d), agents = lane(d, 'Agents');
    const ag = v.activities.find((a) => a.type === 'Agent' && inside(shape(d, a.id), agents) && a.phase !== 'Cross-cutting')!;
    const out = placeActivity(d, ag.id, ag.phase, 'Dev');
    expect(act(out, ag.id).humanPerformer).toBe('role-dev');
    expect(inside(shape(out, ag.id), lane(out, 'Agents'))).toBe(true);
    const out2 = placeActivity(d, 'A003', act(d, 'A003').phase, 'Agents');
    expect(inside(shape(out2, 'A003'), lane(out2, 'Agents'))).toBe(false);
  });
});
