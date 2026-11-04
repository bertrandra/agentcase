/** @calc-zone process-model */
import { boxes, fitShape, PAD, redraw, same, type Box } from './editSubTree';
import { editWhere } from './editTree';
import { readProcess } from './read';
import { attr, el, NS, withAttrs, withChildren, type XDocument } from './xml';

/**
 * The activities of a sub-process laid out together (owner, 2026-11-04: its box must hold its activities only): in a column of their own at the
 * right of the phase's other activities, each in its lane (its row: the role does not change), side by side when several share a lane. The phase
 * widens when the column does not fit, the shapes at its right (the next phases) move right; the flows that touch them are redrawn; the
 * sub-process's box is fitted around them.
 */
const G = 20;
const num = (s: string | undefined): number => Number(s ?? 0);

/** Every shape at or right of `at` moves right by `by`; every shape across it widens (the phase, the lanes, the pool); the flows follow. */
function insertColumn(d: XDocument, at: number, by: number): XDocument {
  return same(d, editWhere(d.root, (e) => (e.ns === NS.dc && e.local === 'Bounds') || (e.ns === NS.di && e.local === 'waypoint'), (e) => {
    const x = num(attr(e, 'x'));
    if (x >= at) return withAttrs(e, { x: x + by });
    return e.local === 'Bounds' && x + num(attr(e, 'width')) > at ? withAttrs(e, { width: num(attr(e, 'width')) + by }) : e;
  }));
}

export function arrangeSub(d: XDocument, sub: string): XDocument {
  const v = readProcess(d), s = v.subProcesses?.find((x) => x.id === sub), at = boxes(v);
  const phase = s && at.get(s.phase);
  if (!s || !phase) return fitShape(d, sub);
  const members = v.activities.filter((a) => a.sub === sub && at.has(a.id)).map((a) => ({ id: a.id, b: at.get(a.id)! }));
  const others = v.activities.filter((a) => a.phase === s.phase && a.sub !== sub && at.has(a.id)).map((a) => at.get(a.id)!);
  const rows = new Map<number, { id: string; b: Box }[]>();
  for (const m of members) rows.set(m.b.y, [...(rows.get(m.b.y) ?? []), m]);
  const cols = Math.max(1, ...[...rows.values()].map((r) => r.length)), w = Math.max(...members.map((m) => m.b.w));
  const x0 = (others.length ? Math.max(...others.map((b) => b.x + b.w)) : phase.x) + 2 * PAD, need = x0 + cols * (w + G) - G + 2 * PAD;
  let out = need > phase.x + phase.w ? insertColumn(d, phase.x + phase.w - 1, need - (phase.x + phase.w)) : d;
  const place = new Map<string, number>();
  for (const r of rows.values()) r.forEach((m, i) => place.set(m.id, x0 + PAD + i * (w + G)));
  out = same(out, editWhere(out.root, (e) => e.ns === NS.bpmndi && e.local === 'BPMNShape' && place.has(attr(e, 'bpmnElement') ?? ''), (e) => {
    const m = members.find((x) => x.id === attr(e, 'bpmnElement'))!;
    return withChildren(e, [el('dc:Bounds', { x: place.get(m.id)!, y: m.b.y, width: m.b.w, height: m.b.h })]);
  }));
  out = fitShape(out, sub);
  const v2 = readProcess(out), at2 = boxes(v2), touched = new Set([sub, ...members.map((m) => m.id)]);
  const flows = v2.flows.filter((f) => touched.has(f.source) || touched.has(f.target));
  return same(out, flows.reduce((r, f) => redraw(r, f.id, at2.get(f.source), at2.get(f.target)), out.root));
}
