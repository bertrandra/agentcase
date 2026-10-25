import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import type { CaseState } from '@/domain';
import { ganttView, type GanttView } from '@/domain/verifyB';

const ids = readdirSync('fixtures/extras/vb_gantt').map((f) => f.replace('.json', '')).sort();
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
interface LRow { label: string; bars: string[][]; title: string }
interface Cap { summary: string[][]; ticks: string[][]; prog: LRow[]; phases: LRow[]; marks: string[][]; release: string[]; overlap: string;
  crossSeq: string | null }
const pct = (s: string | undefined) => parseFloat(s ?? 'NaN');
const near = (got: number, exp: string | undefined) => expect(Math.abs(got - pct(exp))).toBeLessThanOrEqual(0.0051);

/** The legacy rows in display order: each phase, then (when expanded) its artefacts. */
function flatten(v: GanttView, expanded: boolean) {
  return v.phases.flatMap((p) =>
  [{ label: `${expanded && p.arts.length ? '▼' : p.cross || p.arts.length ? '▶' : '·'}${p.name} (${p.count})${p.last ? ' 🏁' : ''}`, s: p, meta: p.meta },
    ...(expanded ? p.arts.map((a) => ({ label: a.label, s: a, meta: a.meta })) : [])]);
}

describe('gantt view reproduces the legacy render', () => {
  describe.each(ids)('%s', (id) => {
    const c = makeCtx(json(`fixtures/cases/${id}.json`) as CaseState), L = json(`fixtures/extras/vb_gantt/${id}.json`) as { collapsed: Cap; expanded: Cap };
    const v = ganttView(c);
    it('summary, ticks, program rows and milestones', () => {
      expect(v.summary).toEqual(L.collapsed.summary);
      expect(v.ticks.map((t) => t.label)).toEqual(L.collapsed.ticks.map((t) => t[1]));
      v.ticks.forEach((t, i) => near(t.left, L.collapsed.ticks[i]![0]));
      expect(v.program.map((r) => r.name)).toEqual(L.collapsed.prog.map((r) => r.label));
      v.program.forEach((r, i) => { near(r.left, L.collapsed.prog[i]!.bars[0]![0]); near(r.w, L.collapsed.prog[i]!.bars[0]![1]); });
      expect(v.markers.map((m) => [m.title, m.label])).toEqual(L.collapsed.marks.map((m) => [m[0], m[2]]));
      v.markers.forEach((m, i) => near(m.left, L.collapsed.marks[i]![1]));
    });
    it.each([['collapsed', false], ['expanded', true]] as const)('delivery rows, %s', (key, expanded) => {
      const cap = L[key], rows = flatten(v, expanded);
      expect(rows.map((r) => r.label)).toEqual(cap.phases.map((r) => r.label));
      rows.forEach((r, i) => {
        const l = cap.phases[i]!;
        expect(l.title.endsWith(r.meta)).toBe(true);
        near(r.s.start, l.bars[0]![0]); near(r.s.act, l.bars[0]![1]); near(r.s.start, l.bars[1]![0]); near(r.s.sup, l.bars[1]![1]);
      });
    });
    it('release marker, overlap and cross-cutting seq', () => {
      const rel = L.collapsed.release.filter(Boolean);
      if (v.release == null) expect(rel).toEqual([]); else near(v.release, rel[0]);
      expect(String(v.overlap)).toBe(L.collapsed.overlap);
      if (L.collapsed.crossSeq != null) expect(String(v.crossSeq)).toBe(L.collapsed.crossSeq);
    });
  });
  it('the ramp-up tie of vb-seq puts V1 and V3 on the same start', () => {
    const v = ganttView(makeCtx(json('fixtures/cases/vb-seq.json') as CaseState)), by = Object.fromEntries(v.phases.map((p) => [p.key, p]));
    expect(by.V1!.start).toBeCloseTo(by.V3!.start, 9);
    expect(v.crossSeq).toBe(3);
  });
});
