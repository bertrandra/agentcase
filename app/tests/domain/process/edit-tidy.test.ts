import { describe, expect, it } from 'vitest';
import { createSubProcess, drawingOf, placeActivity, readProcess, renameSubProcess, tidyAll, tidyPhase, type XDocument } from '@/domain/process';
import { opened } from '../../helpers/processCases';

/** Tidy the layout (owner's request 2026-11-05): a phase's activities back on a grid, in their lane and phase; a sub-process renamed. */
const golden = (): XDocument => opened('golden').BPMN as never;
type B = { x: number; y: number; w: number; h: number };
const inside = (a: B, c: B) => a.x >= c.x && a.x + a.w <= c.x + c.w && a.y >= c.y && a.y + a.h <= c.y + c.h;
const laneOf = (d: XDocument, id: string) => {
  const sh = drawingOf(d).shapes, s = sh.find((x) => x.id === id)!;
  return sh.find((l) => l.kind === 'lane' && s.y + s.h / 2 >= l.y && s.y + s.h / 2 < l.y + l.h)!.label;
};

describe('tidyPhase', () => {
  it('a messy phase back on a grid: same lanes, inside the phase, no overlap, the phases and roles unchanged', () => {
    let d = golden();
    for (const id of ['A001', 'A002', 'A004']) d = placeActivity(d, id, 'L0', 'Lead');
    d = createSubProcess(d, ['A003']);
    const before = readProcess(d).activities.map((a) => [a.id, a.phase, a.humanPerformer, a.sub ?? '']);
    const lanes = new Map(readProcess(d).activities.filter((a) => a.phase === 'L0').map((a) => [a.id, laneOf(d, a.id)]));
    const out = tidyPhase(d, 'L0'), sh = drawingOf(out).shapes, ph = sh.find((s) => s.id === 'L0')!;
    expect(readProcess(out).activities.map((a) => [a.id, a.phase, a.humanPerformer, a.sub ?? ''])).toEqual(before);
    const acts = sh.filter((s) => s.kind === 'activity');
    for (const [id, lane] of lanes) {
      expect(laneOf(out, id)).toBe(lane);
      expect(inside(acts.find((s) => s.id === id)!, ph)).toBe(true);
    }
    for (const a of acts) for (const b of acts) if (a !== b) expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
    const xs = acts.filter((s) => s.phase === 'L0' && !s.sub).map((s) => (s.x - ph.x - 20) % 120);
    expect(new Set(xs)).toEqual(new Set([0]));   // on the grid
  });
  it('every phase at once; an unknown phase changes nothing', () => {
    const d = golden();
    expect(tidyPhase(d, 'nope')).toBe(d);
    const all = tidyAll(d), acts = drawingOf(all).shapes.filter((s) => s.kind === 'activity');
    for (const a of acts) for (const b of acts) if (a !== b) expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
  });
  it('renames a sub-process; an empty name or an unknown one changes nothing', () => {
    const d = createSubProcess(golden(), ['A002']);
    expect(readProcess(renameSubProcess(d, 'Sub_1', ' Drafting agent ')).subProcesses![0]!.name).toBe('Drafting agent');
    expect(renameSubProcess(d, 'Sub_1', '  ')).toBe(d);
    expect(renameSubProcess(d, 'Sub_9', 'x')).toBe(d);
  });
});
