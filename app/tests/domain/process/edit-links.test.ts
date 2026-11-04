import { describe, expect, it } from 'vitest';
import { addLink, drawingOf, linkRefusal, readProcess, reconnectLink, reconnectRefusal, removeLink, type XDocument } from '@/domain/process';
import { opened } from '../../helpers/processCases';

/** The links edited on the canvas (owner's request 2026-11-04): add, move one end, delete; a link stays inside its phase. */
const golden = (): XDocument => opened('golden').BPMN as never;
const plain = (d: XDocument) => readProcess(d).flows.filter((f) => !f.rework);
const edgeOf = (d: XDocument, id: string) => drawingOf(d).edges.find((e) => e.id === id);
/** Three activities of one phase, the first not linked to the other two either way. */
function three(d: XDocument): [string, string, string] {
  const v = readProcess(d), fl = plain(d);
  const linked = (a: string, b: string) => fl.some((f) => (f.source === a && f.target === b) || (f.source === b && f.target === a));
  for (const p of v.phases) {
    const acts = v.activities.filter((a) => a.phase === p.id && !a.regulatory).map((a) => a.id);
    for (const a of acts) {
      const free = acts.filter((x) => x !== a && !linked(a, x));
      if (free.length >= 2) return [a, free[0]!, free[1]!];
    }
  }
  throw new Error('no phase with two unlinked activities');
}

describe('canvas links', () => {
  it('add: a sequence flow in their phase, with an edge between the two shapes; refused across phases, to itself, twice', () => {
    const d = golden(), [a, b] = three(d), out = addLink(d, a, b), f = plain(out).find((x) => x.source === a && x.target === b)!;
    expect(f).toBeDefined();
    expect(f.container).toBe(readProcess(d).activities.find((x) => x.id === a)!.phase);
    expect(edgeOf(out, f.id)!.points.length).toBeGreaterThan(1);
    expect(addLink(out, a, b)).toBe(out);
    expect(linkRefusal(out, a, b)).toMatch(/already linked/);
    expect(linkRefusal(d, a, a)).toMatch(/itself/);
    const other = readProcess(d).activities.find((x) => x.phase !== f.container && !x.regulatory)!.id;
    expect(linkRefusal(d, a, other)).toMatch(/inside one phase/);
    expect(addLink(d, a, other)).toBe(d);
  });
  it('remove: the flow and its edge go; a rework flow or an unknown id is kept', () => {
    const d = golden(), f = plain(d)[0]!, out = removeLink(d, f.id);
    expect(readProcess(out).flows.some((x) => x.id === f.id)).toBe(false);
    expect(edgeOf(out, f.id)).toBeUndefined();
    expect(removeLink(d, 'nope')).toBe(d);
    const rw = readProcess(d).flows.find((x) => x.rework);
    if (rw) expect(removeLink(d, rw.id)).toBe(d);
  });
  it('reconnect: one end moves to another activity of the phase, the edge redrawn; refused where an add would be', () => {
    const d = golden(), [a, b, c] = three(d), one = addLink(d, a, b), id = plain(one).find((x) => x.source === a && x.target === b)!.id;
    const out = reconnectLink(one, id, 'target', c);
    expect(plain(out).some((x) => x.source === a && x.target === c)).toBe(true);
    expect(plain(out).some((x) => x.source === a && x.target === b)).toBe(false);
    expect(reconnectRefusal(one, id, 'target', b)).toMatch(/already ends there/);
    expect(reconnectRefusal(one, id, 'source', b)).toMatch(/itself/);
    expect(reconnectLink(one, id, 'source', b)).toBe(one);
  });
});
