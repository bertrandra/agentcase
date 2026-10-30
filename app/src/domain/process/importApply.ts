/** @calc-zone process-model */
import { taskOf } from './buildTasks';
import { updateActivities, setScope, type ActivityPatch } from './editActivity';
import { findById, moveActivity } from './editMore';
import { addActor } from './editModel';
import { appendChild, editById, editWhere, idsOf, withExt } from './editTree';
import { dataId, diId, roleId } from './ids';
import { activityDefaults } from './importDefaults';
import { analyseImport, phaseFor, previewImport } from './importPlan';
import type { ImportAnalysis, ImportChoices, IncomingTask } from './importTypes';
import { readProcess } from './read';
import { attr, textOf, withAttrs, type XDocument, type XElement } from './xml';
import { indent } from './xmlWrite';

/**
 * `process.import` (spec F-B6, F-B7, F-B8; phase B4) as one pure function of the case's process and the file. Replace with an AgentCase file: the
 * file becomes the process (pass-through kept, F-B11). Otherwise the file is mapped onto the case's process: known activities updated (their
 * parameters, or for a foreign task its scope), new ones added to their phase (an AgentCase task as written; a foreign task with defaulted
 * parameters, F-B8), new roles created with the team skill chosen (D-B10), and the case's other activities kept, switched out of scope or
 * (replace) removed. A refused import (see `previewImport`) returns the case's document unchanged.
 */
type Doc = XDocument;
const same = (d: Doc, root: XElement): Doc => (root === d.root ? d : { ...d, root });

/** Several activities removed in one pass, with their deliverables, the flows that touch them (rework pairs included) and their shapes. */
export function removeActivities(d: Doc, ids: ReadonlySet<string>): Doc {
  if (!ids.size) return d;
  const touches = (f: { source: string; target: string; rework?: { activityA: string; activityB: string } }): boolean =>
    ids.has(f.source) || ids.has(f.target) || (!!f.rework && (ids.has(f.rework.activityA) || ids.has(f.rework.activityB)));
  const gone = new Set([...ids, ...[...ids].map(dataId), ...readProcess(d).flows.filter(touches).map((f) => f.id)]);
  const shapes = new Set([...gone].map(diId));
  return same(d, editWhere(d.root, (e) => gone.has(attr(e, 'id') ?? '') || shapes.has(attr(e, 'id') ?? ''), () => null));
}

/** Elements appended to their phases (one rebuild per phase), indented at the depth of the phase's children. */
function appendTo(d: Doc, items: { phase: string; els: XElement[] }[]): Doc {
  let root = d.root;
  for (const phase of [...new Set(items.map((i) => i.phase))]) {
    const els = items.filter((i) => i.phase === phase).flatMap((i) => i.els);
    root = editById(root, phase, (ph) => els.reduce((p, e) => appendChild(p, e), ph));
  }
  return same(d, root);
}

/** The resources an AgentCase task names (`resourceRef`, `ac:agent`) that the case does not have, copied from the file as actors. */
function withActorsOf(d: Doc, file: Doc, els: XElement[]): Doc {
  const refs = new Set<string>(), walk = (e: XElement): void => {
    if (e.local === 'resourceRef') refs.add(textOf(e).trim());
    const ag = attr(e, 'ac:agent');
    if (ag) refs.add(ag);
    for (const c of e.children) if (c.kind === 'element') walk(c);
  };
  els.forEach(walk);
  const fileActors = readProcess(file).actors, have = new Set(readProcess(d).actors.map((a) => a.id));
  return fileActors.filter((a) => refs.has(a.id) && !have.has(a.id)).reduce((acc, a) => addActor(acc, {
    id: a.id, name: a.name, kind: a.kind === 'agent' ? 'agent' : 'role', teamSkill: a.teamSkill, capability: a.capability }), d);
}

const patchOf = (t: IncomingTask): ActivityPatch => {
  const v = t.view;
  if (!v) return { inScope: t.inScope };
  const p: ActivityPatch = { name: v.name, inScope: t.inScope, effort: v.effort, agentSup: v.agent, humanSup: v.human, value: v.value,
    aiAuthority: v.aiAuthority };
  if (v.seq !== undefined) p.seq = v.seq;
  if (v.capability !== undefined) p.capability = v.capability;
  return p;
};

/** A free id for a foreign task: its own when unused, else with a suffix. */
function freeId(id: string, used: Set<string>): string {
  let out = id, n = 1;
  while (used.has(out) || used.has(dataId(out))) out = `${id}-imp${n++ > 1 ? n - 1 : ''}`;
  used.add(out);
  return out;
}

/** The case's process after the import, with the ids actually added (a foreign task may get a suffixed id). */
export function applyImport(current: Doc, file: Doc, c: ImportChoices, a: ImportAnalysis = analyseImport(current, file)): { doc: Doc; added: string[] } {
  const pv = previewImport(current, a, c);
  if (pv.refusal || pv.unmappedUnits.length || pv.unmappedRoles.length) return { doc: current, added: [] };
  const skip = new Set(pv.skipped), taken = a.tasks.filter((t) => !skip.has(t.id));
  if (a.agentcase && c.mode === 'replace') return { doc: removeActivities(file, skip), added: pv.added };
  let d = c.mode === 'replace' ? removeActivities(current, new Set(pv.removed)) : setScope(current, pv.outOfScope, false);
  d = updateActivities(d, new Map(taken.filter((t) => t.match).map((t) => [t.match as string, patchOf(t)])));
  for (const t of taken) if (t.match && t.view && readProcess(d).phases.some((p) => p.id === t.view?.phase)) d = moveActivity(d, t.match, t.view.phase);
  const fresh = taken.filter((t) => !t.match), used = idsOf(d.root), added: string[] = [], items: { phase: string; els: XElement[] }[] = [];
  if (a.agentcase) {
    for (const t of fresh) {
      const el = findById(file.root, t.id), phase = phaseFor(a, c, t.unit), data = findById(file.root, dataId(t.id));
      if (!el || !phase || used.has(t.id)) continue;
      items.push({ phase, els: [withExt(el, 'activity', { phase }), ...(data ? [data] : [])] });
      added.push(t.id);
    }
    d = withActorsOf(d, file, items.flatMap((i) => i.els));
    return { doc: appendTo(d, items), added };
  }
  for (const r of pv.newRoles) d = addActor(d, { id: roleId(r.name), name: r.name, kind: 'role', teamSkill: r.teamSkill });
  const v = readProcess(d), roles = new Map(a.roles.map((r) => [r.name, r.known ?? r.name]));
  let order = Math.max(0, ...v.activities.filter((x) => !x.regulatory).map((x) => x.order));
  for (const t of fresh) {
    const phase = phaseFor(a, c, t.unit) as string, id = freeId(t.id, used), role = roles.get(t.roles[0] ?? '');
    const art = { ...activityDefaults(v, phase, t.element, role), id, name: t.name, deliverable: '' };
    items.push({ phase, els: [indent(withAttrs(taskOf(art, ++order, false), { 'ac:inScope': t.inScope }), '  ', 3)] });
    added.push(id);
  }
  return { doc: appendTo(d, items), added };
}
