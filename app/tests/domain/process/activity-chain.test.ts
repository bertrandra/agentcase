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
  it('linkPoints: straight on one row, elbowed across rows, down when the grid wraps', () => {
    const box = (x: number, y: number) => ({ x, y, w: 100, h: 80 });
    expect(linkPoints(box(0, 0), box(150, 0))).toEqual([[100, 40], [150, 40]]);
    expect(linkPoints(box(0, 0), box(150, 100))).toEqual([[100, 40], [125, 40], [125, 140], [150, 140]]);
    expect(linkPoints(box(150, 0), box(0, 100))).toEqual([[200, 80], [200, 90], [50, 90], [50, 100]]);
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
