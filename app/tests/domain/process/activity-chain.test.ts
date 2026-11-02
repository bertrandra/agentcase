import { describe, expect, it } from 'vitest';
import { moveActivity, readProcess, removeActivity, updateActivity, type XDocument } from '@/domain/process';
import { bridgesOver } from '@/domain/process/bridge';
import { linkPoints } from '@/domain/process/buildDi';
import { partialOf } from '@/domain/process/partial';
import { doc } from '@/domain/process/xml';
import { makeDefaultDoc } from '@/store/instance';
import { CUSTOM } from '../../store/samples/process';

/**
 * SPEC_FIXES FX-D9 (owner's request 2026-11-02, "links within for activities"): inside each phase the default process links its activities one
 * after the other (sequence, SDLC before regulatory, catalogue order), each link drawn; removing, moving or leaving out an activity links its
 * neighbours over it. No figure reads the order.
 */
const base = (): XDocument => makeDefaultDoc().BPMN;
const links = (d: XDocument, phase: string) => readProcess(d).flows.filter((f) => f.container === phase && !f.rework);
const chainOf = (d: XDocument, phase: string): string[] => {
  const fs = links(d, phase), next = new Map(fs.map((f) => [f.source, f.target])), targets = new Set(fs.map((f) => f.target));
  const out: string[] = [];
  for (let x = fs.find((f) => !targets.has(f.source))?.source; x !== undefined; x = next.get(x)) out.push(x);
  return out;
};
/** a phase whose chain holds at least three activities, and its chain */
const longPhase = (d: XDocument): { phase: string; chain: string[] } => {
  const v = readProcess(d);
  for (const p of v.phases) { const chain = chainOf(d, p.id); if (chain.length >= 3) return { phase: p.id, chain }; }
  throw new Error('no phase with three linked activities');
};

describe('activity links inside each phase (FX-D9)', () => {
  it('every phase but Cross-cutting chains all its activities once, each link drawn', () => {
    const d = base(), v = readProcess(d), edges = new Set(v.diagram.edges.map((e) => e.element));
    for (const p of v.phases) {
      const acts = v.activities.filter((a) => a.phase === p.id && !a.trigger);
      if (p.adHoc) { expect(links(d, p.id)).toEqual([]); continue; }
      if (acts.length < 2) continue;
      expect(chainOf(d, p.id).sort()).toEqual(acts.map((a) => a.id).sort());
      for (const f of links(d, p.id)) expect(edges.has(f.id)).toBe(true);
    }
  });
  it('removing an activity links its neighbours (with a drawn edge); a moved activity is linked over in its old phase', () => {
    const d = base(), { phase, chain } = longPhase(d), [a, b, c] = chain as [string, string, string];
    const r = removeActivity(d, b);
    expect(chainOf(r, phase)).toEqual(chain.filter((x) => x !== b));
    const bridge = links(r, phase).find((f) => f.source === a && f.target === c)!;
    expect(readProcess(r).diagram.edges.some((e) => e.element === bridge.id)).toBe(true);
    const other = readProcess(d).phases.find((p) => p.id !== phase && !p.adHoc)!.id, m = moveActivity(d, b, other);
    if (m !== d) expect(chainOf(m, phase)).toEqual(chain.filter((x) => x !== b));
  });
  it('the in-scope-only export links over the activities left out', () => {
    const d0 = base(), { phase, chain } = longPhase(d0), [, b] = chain as [string, string], d = updateActivity(d0, b, { inScope: false });
    const kept = new Set(readProcess(d).activities.filter((a) => a.inScope !== false).map((a) => a.id));
    expect(chainOf(doc(partialOf(d.root), null), phase)).toEqual(chain.filter((x) => kept.has(x)));
  });
  it('bridgesOver walks through consecutive gone nodes and never duplicates or self-loops', () => {
    const f = (source: string, target: string) => ({ source, target, container: 'P' });
    expect(bridgesOver([f('a', 'b'), f('b', 'c'), f('c', 'd')], new Set(['b', 'c']))).toEqual([f('a', 'd')]);
    expect(bridgesOver([f('a', 'b'), f('b', 'c'), f('a', 'c')], new Set(['b']))).toEqual([]);
    expect(bridgesOver([f('a', 'b'), f('b', 'a')], new Set(['b']))).toEqual([]);
    expect(bridgesOver([{ ...f('a', 'b'), rework: {} }, f('b', 'c')], new Set(['b']))).toEqual([]);
  });
  it('linkPoints: straight to the next box of a row, otherwise through the column gap and the row gap above the target', () => {
    const box = (x: number, y: number) => ({ x, y, w: 100, h: 80 });
    expect(linkPoints(box(0, 0), box(120, 0))).toEqual([[100, 40], [120, 40]]);
    expect(linkPoints(box(0, 0), box(120, 100))).toEqual([[100, 40], [110, 40], [110, 90], [170, 90], [170, 100]]);
    expect(linkPoints(box(120, 0), box(0, 100))).toEqual([[220, 40], [230, 40], [230, 90], [50, 90], [50, 100]]);
  });
  it('no link of the default diagram crosses an activity box', () => {
    const v = readProcess(base()), boxes = v.diagram.shapes.filter((s) => v.activities.some((a) => a.id === s.element));
    const links = new Set(v.flows.filter((f) => !f.rework && f.container !== 'Process').map((f) => f.id));
    const cross = (p: [number, number], q: [number, number], b: { x: number; y: number; w: number; h: number }) => {
      const [x1, x2] = [Math.min(p[0], q[0]), Math.max(p[0], q[0])], [y1, y2] = [Math.min(p[1], q[1]), Math.max(p[1], q[1])];
      return x1 < b.x + b.w && x2 > b.x && y1 < b.y + b.h && y2 > b.y;
    };
    for (const e of v.diagram.edges.filter((x) => links.has(x.element))) {
      const f = v.flows.find((x) => x.id === e.element)!;
      for (const b of boxes.filter((x) => x.element !== f.source && x.element !== f.target)) {
        e.points.slice(1).forEach((q, i) => expect(cross(e.points[i]!, q, b), `${e.element} over ${b.element}`).toBe(false));
      }
    }
  });
});

describe('process.linkActivities (FX-D9)', () => {
  it('an added activity joins the end of its phase chain; a linked document is returned as is', async () => {
    const { addActivity, linkActivities } = await import('@/domain/process');
    const d = base();
    expect(linkActivities(d)).toBe(d);
    const chain = chainOf(d, 'V2'), a = addActivity(d, CUSTOM);
    expect(a).not.toBe(d);
    const l = linkActivities(a);
    expect(chainOf(l, 'V2')).toEqual([...chain, CUSTOM.id]);
    expect(linkActivities(l)).toBe(l);
  });
});
