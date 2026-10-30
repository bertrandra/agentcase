/** @calc-zone process-model */
import { dataObjectOf, taskOf } from './buildTasks';
import { dataId, diId, normKey } from './ids';
import { readProcess } from './read';
import { appendChild, editById, editWhere, idsOf, withExt } from './editTree';
import { indent } from './xmlWrite';
import type { CatArtefact } from './types';
import { attr, NS, withAttrs, type AttrInput, type XDocument, type XElement } from './xml';

/** What `updateActivity` may change on an activity (spec § 9 `process.updateActivity`): its name, scope and engine parameters. */
export interface ActivityPatch {
  name?: string; inScope?: boolean; effort?: number; seq?: number | null; agentSup?: number; humanSup?: number; value?: string; aiAuthority?: string;
  capability?: string;
}

/** One activity's element with the patch applied (the parameters in `ac:activity` / `ac:supervision`, as the profile stores them). */
function patched(e: XElement, p: ActivityPatch): XElement {
  const own: AttrInput = {};
  if (p.name !== undefined) own.name = p.name;
  if (p.inScope !== undefined) own['ac:inScope'] = p.inScope;
  let out = withAttrs(e, own);
  const act: Record<string, string | number | null | undefined> = { effort: p.effort, value: p.value, aiAuthority: p.aiAuthority, capability: p.capability };
  if (p.seq !== undefined) act.seq = p.seq;
  out = withExt(out, 'activity', Object.fromEntries(Object.entries(act).filter(([k, v]) => v !== undefined || (k === 'seq' && p.seq === null))));
  return withExt(out, 'supervision', Object.fromEntries(Object.entries({ human: p.humanSup, agent: p.agentSup }).filter(([, v]) => v !== undefined)));
}
const isActivity = (e: XElement): boolean => e.ns === NS.bpmn && (e.local === 'task' || e.local.endsWith('Task'));

/** `process.updateActivity`: the activity's attributes and parameters changed in place (the same document when the id is unknown). */
export function updateActivity(d: XDocument, id: string, p: ActivityPatch): XDocument {
  const root = editById(d.root, id, (e) => (isActivity(e) ? patched(e, p) : e));
  return root === d.root ? d : { ...d, root };
}
/** Several activities in one pass (a bulk edit: reset to the catalogue values, a phase's automation share). */
export function updateActivities(d: XDocument, patches: ReadonlyMap<string, ActivityPatch>): XDocument {
  if (!patches.size) return d;
  const root = editWhere(d.root, (e) => isActivity(e) && patches.has(attr(e, 'id') ?? ''), (e) => patched(e, patches.get(attr(e, 'id') ?? '') ?? {}));
  return root === d.root ? d : { ...d, root };
}

/** `process.setScope`: `ac:inScope` of activities, phases and norms (by element id or, for a norm, by its `industry:name` key). */
export function setScope(d: XDocument, ids: readonly string[], on: boolean): XDocument {
  const v = readProcess(d), byKey = new Map(v.norms.map((n) => [normKey(n.industry, n.name), n.id])), want = new Set(ids.map((i) => byKey.get(i) ?? i));
  const scoped = new Set([...v.activities.map((a) => a.id), ...v.phases.map((p) => p.id), ...v.norms.map((n) => n.id)].filter((i) => want.has(i)));
  if (!scoped.size) return d;
  const root = editWhere(d.root, (e) => scoped.has(attr(e, 'id') ?? ''), (e) => withAttrs(e, { 'ac:inScope': on }));
  return root === d.root ? d : { ...d, root };
}

/** `process.addActivity`: a new activity (spec F-B18: phase, type, role, parameters) appended to its phase; refused (same document) on a used id. */
export function addActivity(d: XDocument, a: CatArtefact & { regulatory?: boolean; inScope?: boolean }): XDocument {
  if (idsOf(d.root).has(a.id) || !readProcess(d).phases.some((p) => p.id === a.phase)) return d;
  const order = Math.max(0, ...readProcess(d).activities.filter((x) => x.regulatory === !!a.regulatory).map((x) => x.order)) + 1;
  const task = withAttrs(taskOf(a, order, !!a.regulatory), { 'ac:inScope': a.inScope ?? true });
  const add = (ph: XElement, e: XElement): XElement => appendChild(ph, indent(e, '  ', depthOf(ph)));
  // an SDLC activity's deliverable is a data object next to it (the task's output association references it)
  const root = editById(d.root, a.phase, (ph) => (!a.regulatory && a.deliverable ? add(add(ph, task), dataObjectOf(a)) : add(ph, task)));
  return { ...d, root };
}
const depthOf = (ph: XElement): number => {
  const t = ph.children[ph.children.length - 1];
  return t?.kind === 'text' ? Math.max(0, t.text.length - 1) / 2 + 1 : 3;
};

/** `process.removeActivity`: the task, its deliverable, the flows that touch it (a rework pair it belongs to too) and their diagram shapes. */
export function removeActivity(d: XDocument, id: string): XDocument {
  const a = readProcess(d).activities.find((x) => x.id === id);
  if (!a) return d;
  const touches = (f: { source: string; target: string; rework?: { activityA: string; activityB: string } }): boolean =>
    f.source === id || f.target === id || f.rework?.activityA === id || f.rework?.activityB === id;
  const flows = new Set(readProcess(d).flows.filter(touches).map((f) => f.id));
  const gone = new Set([id, dataId(id), ...flows]), shapes = new Set([...gone].map(diId));
  const root = editWhere(d.root, (e) => gone.has(attr(e, 'id') ?? '') || shapes.has(attr(e, 'id') ?? ''), () => null);
  return { ...d, root };
}
