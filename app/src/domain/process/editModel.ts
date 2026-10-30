/** @calc-zone process-model */
import { appendChild, editById, editWhere, idsOf, withExt } from './editTree';
import { readProcess } from './read';
import { attr, el, kids, NS, text, textOf, withAttrs, withChildren, type XDocument, type XElement, type XNode } from './xml';
import { indent } from './xmlWrite';

/**
 * Process commands on actors and phases (spec § 9: `process.addActor`, `updateActor`, `removeActor`, `addPhase`, `removePhase`, `reorderPhases`).
 * Each returns the same document when the change is refused (unknown or used id, an actor still referenced, a phase that holds activities).
 */
export interface ActorInput { id: string; name: string; kind: 'role' | 'agent'; teamSkill?: string; capability?: string }
const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });

/** After the last resource of the definitions (or before the first element when there is none), indented like it. */
function insertResource(defs: XElement, r: XElement): XElement {
  const cs = defs.children;
  let at = -1;
  cs.forEach((c, i) => { if (c.kind === 'element' && c.ns === NS.bpmn && (c.local === 'resource' || c.local === 'category')) at = i; });
  const next: XNode[] = [...cs];
  next.splice(at + 1, 0, text('\n  '), indent(r, '  ', 1));
  return withChildren(defs, next);
}
export function addActor(d: XDocument, a: ActorInput): XDocument {
  if (idsOf(d.root).has(a.id)) return d;
  const actor = el('ac:actor', { kind: a.kind, teamSkill: a.teamSkill, capability: a.capability });
  return same(d, insertResource(d.root, el('bpmn:resource', { id: a.id, name: a.name }, [el('bpmn:extensionElements', {}, [actor])])));
}
export function updateActor(d: XDocument, id: string, p: { name?: string; teamSkill?: string | null; capability?: string | null }): XDocument {
  if (!readProcess(d).actors.some((r) => r.id === id)) return d;
  return same(d, editById(d.root, id, (e) => withExt(withAttrs(e, { name: p.name }), 'actor', { teamSkill: p.teamSkill, capability: p.capability })));
}
/** True when an activity or a lane still names the actor (a `resourceRef`, `ac:agent`). */
function referenced(root: XElement, id: string): boolean {
  if (root.local === 'resourceRef' && textOf(root).trim() === id) return true;
  if (attr(root, 'ac:agent') === id) return true;
  return kids(root).some((c) => referenced(c, id));
}
export function removeActor(d: XDocument, id: string): XDocument {
  if (!readProcess(d).actors.some((r) => r.id === id) || referenced(d.root, id)) return d;
  return same(d, editById(d.root, id, () => null));
}

/** A new, empty phase (a sub-process with its `ac:phase`), after the last phase of the process; out of scope until it holds activities. */
export function addPhase(d: XDocument, p: { id: string; name: string; role?: string }): XDocument {
  const v = readProcess(d);
  if (idsOf(d.root).has(p.id)) return d;
  const order = Math.max(0, ...v.phases.map((x) => x.order ?? 0)) + 1, seq = Math.max(0, ...v.phases.filter((x) => !x.adHoc).map((x) => x.seq)) + 1;
  const ph = el('bpmn:subProcess', { id: p.id, name: p.name }, [el('bpmn:extensionElements', {}, [el('ac:phase', { code: p.id, seq, role: p.role, order })])]);
  const proc = kids(d.root, NS.bpmn, 'process')[0], pid = proc ? attr(proc, 'id') : undefined;
  return pid === undefined ? d : same(d, editById(d.root, pid, (e) => appendChild(e, indent(ph, '  ', 2))));
}
export function removePhase(d: XDocument, id: string): XDocument {
  const v = readProcess(d);
  if (!v.phases.some((p) => p.id === id) || v.activities.some((a) => a.phase === id)) return d;
  return same(d, editWhere(d.root, (e) => attr(e, 'id') === id || attr(e, 'bpmnElement') === id || (e.local === 'sequenceFlow' &&
    (attr(e, 'sourceRef') === id || attr(e, 'targetRef') === id)), () => null));
}
/** The phases' order (`ac:phase order`, what the views sort by) set from a list of phase ids; phases left out keep their place after them. */
export function reorderPhases(d: XDocument, ids: readonly string[]): XDocument {
  const v = readProcess(d), known = v.phases.filter((p) => !p.adHoc).map((p) => p.id);
  const order = [...ids.filter((i) => known.includes(i)), ...known.filter((i) => !ids.includes(i))];
  let root = d.root;
  order.forEach((id, i) => { root = editById(root, id, (e) => withExt(e, 'phase', { order: i + 1 })); });
  return same(d, root);
}
