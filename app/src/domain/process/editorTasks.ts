/** @calc-zone process-model */
import { taskOf } from './buildTasks';
import { editById, editWhere, withExt } from './editTree';
import { findById } from './editMore';
import { Prefixes, reprefix } from './editorMerge';
import { dataId } from './ids';
import { activityDefaults } from './importDefaults';
import { readProcess as readOf } from './read';
import { extOf, type ProcessView } from './readTypes';
import { attr, NS, withAttrs, type XDocument, type XElement, type XNode } from './xml';
import { indent } from './xmlWrite';

/**
 * The AgentCase side of an editor save (phase B6): what the merged tree needs so that the model still reads as the case's process. A task drawn
 * in a phase gets the parameters of the activities of its phase and type, like a foreign import's task (F-B8, "parameters to review"); a task
 * moved to another phase takes its new phase (`ac:activity phase`) and its deliverable along; a removed task's deliverable goes with it.
 */
const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });
const isOwn = (c: XNode, local: string): boolean => c.kind === 'element' && c.ns === NS.bpmn && c.local === local;

/** The depth of the element with this id below the root (the root's children are at depth 1). */
function depthOf(e: XElement, id: string, depth = 0): number {
  for (const c of e.children) {
    if (c.kind !== 'element') continue;
    if (attr(c, 'id') === id) return depth + 1;
    const d = depthOf(c, id, depth + 1);
    if (d >= 0) return d;
  }
  return -1;
}

/** A task drawn in the editor, as an AgentCase activity of its phase: the defaults of the phase, the editor's flow references kept. */
function parameterised(d: XDocument, task: XElement, phase: string, order: number): XElement {
  const id = attr(task, 'id') ?? '', px = new Prefixes(d.root);
  const art = { ...activityDefaults(readOf(d), phase, task.local, undefined), id, name: attr(task, 'name') ?? id, deliverable: '' };
  const built = reprefix(taskOf(art, order, false), px);
  const own = (local: string) => built.children.filter((c) => isOwn(c, local));
  const kept = task.children.filter((c) => c.kind === 'element' && !isOwn(c, 'extensionElements') && !isOwn(c, 'documentation'));
  const children = [...task.children.filter((c) => isOwn(c, 'documentation')), ...own('extensionElements'), ...kept, ...own('performer'),
    ...own('humanPerformer')];
  const attrs = withAttrs({ ...built, attrs: [...built.attrs, ...task.attrs.filter((a) => a.name !== 'id' && a.name !== 'name')] }, { 'ac:inScope': true });
  return indent({ ...attrs, children }, '  ', Math.max(0, depthOf(d.root, id)));
}

/** New activities (ids the case did not have): parameters when the editor drew a plain task, else the phase they now sit in. */
export function withNewActivities(d: XDocument, before: ProcessView, ids: readonly string[]): XDocument {
  let out = d;
  for (const id of ids) {
    const v = readOf(out), a = v.activities.find((x) => x.id === id), task = findById(out.root, id);
    if (!a || !task || before.activities.some((x) => x.id === id)) continue;
    const order = Math.max(0, ...v.activities.filter((x) => !x.regulatory && x.id !== id).map((x) => x.order)) + 1;
    const next = extOf(task, 'activity') ? withExt(task, 'activity', { phase: a.phase, order }) : parameterised(out, task, a.phase, order);
    out = same(out, editById(out.root, id, () => next));
  }
  return out;
}

/** Activities the editor moved to another phase: their `ac:activity phase` and their deliverable (a data object of the old phase) follow. */
export function withMovedActivities(d: XDocument, moved: readonly { id: string; to: string }[]): XDocument {
  let out = d;
  for (const m of moved) {
    out = same(out, editById(out.root, m.id, (t) => withExt(t, 'activity', { phase: m.to })));
    const data = findById(out.root, dataId(m.id)), ph = findById(out.root, m.to);
    if (!data || !ph || ph.children.includes(data)) continue;
    const root = editWhere(out.root, (e) => e === data, () => null);
    out = same(out, editById(root, m.to, (p) => {
      const tail = p.children[p.children.length - 1], depth = Math.max(1, depthOf(root, m.to) + 1);
      const lead: XNode = { kind: 'text', text: `\n${'  '.repeat(depth)}` };
      const body = tail?.kind === 'text' && !tail.text.trim() ? p.children.slice(0, -1) : p.children;
      return { ...p, children: [...body, lead, indent(data, '  ', depth), ...(body === p.children ? [] : [tail as XNode])] };
    }));
  }
  return out;
}

/** The deliverables (data objects `<id>_data`) of activities the editor removed. */
export function withoutDeliverables(d: XDocument, removed: readonly string[]): XDocument {
  const gone = new Set(removed.map(dataId));
  if (!gone.size) return d;
  return same(d, editWhere(d.root, (e) => e.ns === NS.bpmn && e.local === 'dataObject' && gone.has(attr(e, 'id') ?? ''), () => null));
}
