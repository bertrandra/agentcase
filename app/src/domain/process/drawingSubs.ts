/** @calc-zone process-model */
import { linkPoints } from './buildDi';
import type { DrawEdge, Drawing, DrawShape } from './drawing';

/**
 * The sub-processes of a drawn view fitted around their activities (owner, 2026-11-04): a view moves activities (process only, compact, one phase,
 * hidden ones), so each sub-process box is redrawn around the activities it still shows, and the links to it follow; a sub-process with none shown
 * is left out with its links. A drawing view, never stored.
 */
const PAD = 20, HEAD = 30;
export function fitSubs(d: Drawing): Drawing {
  if (!d.shapes.some((s) => s.kind === 'sub')) return d;
  const gone = new Set<string>(), fitted = new Map<string, DrawShape>();
  for (const sub of d.shapes.filter((s) => s.kind === 'sub')) {
    const m = d.shapes.filter((s) => s.kind === 'activity' && s.sub === sub.id);
    if (!m.length) { gone.add(sub.id); continue; }
    const x = Math.min(...m.map((s) => s.x)) - PAD, y = Math.min(...m.map((s) => s.y)) - HEAD;
    fitted.set(sub.id, { ...sub, x, y, w: Math.max(...m.map((s) => s.x + s.w)) + PAD - x, h: Math.max(...m.map((s) => s.y + s.h)) + PAD - y });
  }
  const { shapes, edges } = rebuild(d, gone, fitted);
  return { ...d, shapes, edges };
}

/**
 * The sub-processes `ids` drawn collapsed (owner, 2026-11-05; BPMN's collapsed sub-process): one box the size of an activity at the sub-process's
 * place, marked with how many activities it holds; its activities and the flows between them are not drawn, the links to it follow.
 */
export function collapseSubs(d: Drawing, ids: ReadonlySet<string>): Drawing {
  const subs = d.shapes.filter((s) => s.kind === 'sub' && ids.has(s.id));
  if (!subs.length) return d;
  const hidden = new Set(d.shapes.filter((s) => s.kind === 'activity' && s.sub && ids.has(s.sub)).map((s) => s.id));
  const small = new Map(subs.map((s) => {
    const n = d.shapes.filter((a) => a.kind === 'activity' && a.sub === s.id).length;
    return [s.id, { ...s, w: 100, h: 80, marker: `▸ ${n} ${n > 1 ? 'activities' : 'activity'}`, collapsed: true }];
  }));
  const { shapes, edges } = rebuild(d, hidden, small);
  return { ...d, shapes, edges };
}

/** The shapes without `gone`, with `changed` in place of theirs; the edges to a gone shape left out, those to a changed one redrawn. */
function rebuild(d: Drawing, gone: ReadonlySet<string>, changed: ReadonlyMap<string, DrawShape>): Pick<Drawing, 'shapes' | 'edges'> {
  const shapes = d.shapes.filter((s) => !gone.has(s.id)).map((s) => changed.get(s.id) ?? s), at = new Map(shapes.map((s) => [s.id, s]));
  const edges = d.edges.filter((e) => !(e.source && gone.has(e.source)) && !(e.target && gone.has(e.target))).map((e): DrawEdge => {
    if (!((e.source && changed.has(e.source)) || (e.target && changed.has(e.target)))) return e;
    const a = e.source ? at.get(e.source) : undefined, b = e.target ? at.get(e.target) : undefined;
    return a && b ? { ...e, points: linkPoints(a, b) } : e;
  });
  return { shapes, edges };
}
