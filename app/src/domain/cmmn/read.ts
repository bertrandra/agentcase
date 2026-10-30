/** @calc-zone process-model */
import { withExt } from '../process/editTree';
import { updateActivity } from '../process/editActivity';
import { readEvents } from '../process/profile/events';
import { editDoc } from '../process/profile/tree';
import { indexOf, TASK_KINDS } from '../process/profile/walk';
import { readProcess } from '../process/read';
import { attr, kid, kids, NS, withChildren, type XDocument, type XElement } from '../process/xml';
import { CMMN_NS } from './export';

/**
 * The read-back of a CMMN file (F-B63, D-B25 a; phase B7b): AgentCase reads only what maps to its model (tasks, roles, frequencies) and leaves the
 * rest. A task (`humanTask`, `task`…) whose id is an activity of the case gives its name and, for a human task, its role (the `caseRoles` role it
 * names, matched by name to a role resource of the process: the activity's `humanPerformer`); a stage whose id is an event sub-process gives
 * its `ac:frequency`. Sentries, milestones, planning tables and anything else are counted as not read.
 */
export interface CmmnTask { id: string; name: string; role?: string }
export interface CmmnStage { id: string; name: string; frequency?: { count: number; per: string } }
export interface CmmnView { tasks: CmmnTask[]; stages: CmmnStage[]; ignored: Record<string, number> }
const TASKS = ['humanTask', 'task', 'processTask', 'caseTask', 'decisionTask'];
const KNOWN = [...TASKS, 'definitions', 'case', 'casePlanModel', 'stage', 'planItem', 'caseRoles', 'role', 'extensionElements', 'documentation'];

/** True for a CMMN 1.1 `definitions` element. */
export const isCmmn = (e: XElement): boolean => e.ns === CMMN_NS && e.local === 'definitions';

export function readCmmn(root: XElement): CmmnView {
  const roles = new Map<string, string>(), out: CmmnView = { tasks: [], stages: [], ignored: {} };
  const walk = (e: XElement): void => {
    for (const x of kids(e)) {
      if (x.ns !== CMMN_NS) continue;
      if (x.local === 'role') roles.set(attr(x, 'id') ?? '', attr(x, 'name') ?? '');
      if (!KNOWN.includes(x.local)) out.ignored[x.local] = (out.ignored[x.local] ?? 0) + 1;
      walk(x);
    }
  };
  walk(root);
  const each = (e: XElement): void => {
    for (const x of kids(e).filter((k) => k.ns === CMMN_NS)) {
      const id = attr(x, 'id') ?? '', name = attr(x, 'name') ?? '';
      if (TASKS.includes(x.local)) {
        const role = roles.get(attr(x, 'performerRef') ?? '');
        out.tasks.push(role ? { id, name, role } : { id, name });
      } else if (x.local === 'stage') {
        const ext = kid(x, CMMN_NS, 'extensionElements'), f = ext ? kid(ext, NS.ac, 'frequency') : undefined, n = Number(f ? attr(f, 'count') : NaN);
        out.stages.push(f && Number.isFinite(n) ? { id, name, frequency: { count: n, per: attr(f, 'per') ?? '' } } : { id, name });
      }
      each(x);
    }
  };
  each(root);
  return out;
}

/** The document with a task's `humanPerformer` pointing to another role resource. */
const withPerformer = (d: XDocument, task: string, role: string): XDocument => editDoc(d, task, (t) => withChildren(t, t.children.map((h) => {
  if (h.kind !== 'element' || h.ns !== NS.bpmn || h.local !== 'humanPerformer') return h;
  const r = kid(h, NS.bpmn, 'resourceRef');
  return r ? withChildren(h, h.children.map((x) => (x === r ? withChildren(r, [{ kind: 'text', text: role }]) : x))) : h;
})));

/** What the read-back changes in the case's process: names, roles and frequencies of known elements, and what it could not map. */
export function applyCmmn(d: XDocument, v: CmmnView): { doc: XDocument; updated: string[]; unknown: string[] } {
  const p = readProcess(d), ix = indexOf(d.root), subs = new Map(readEvents(d.root).eventSubs.map((s) => [s.id, s]));
  const roleIds = new Map(p.actors.filter((a) => a.kind === 'role').map((a) => [a.name, a.id])), acts = new Map(p.activities.map((a) => [a.id, a]));
  let doc = d;
  const updated: string[] = [], unknown: string[] = [];
  for (const t of v.tasks) {
    const a = acts.get(t.id);
    if (!a || !TASK_KINDS.includes(ix.byId.get(t.id)?.e.local ?? '')) { unknown.push(t.id); continue; }
    const before = doc;
    if (t.name && t.name !== a.name) doc = updateActivity(doc, t.id, { name: t.name });
    const r = t.role !== undefined ? roleIds.get(t.role) : undefined;
    if (r && r !== a.humanPerformer && a.humanPerformer !== undefined) doc = withPerformer(doc, t.id, r);
    if (doc !== before) updated.push(t.id);
  }
  for (const s of v.stages) {
    const cur = subs.get(s.id);
    if (!cur) { unknown.push(s.id); continue; }
    const f = s.frequency;
    if (f && (f.count !== cur.frequency?.count || f.per !== cur.frequency.per)) {
      const before = doc;
      doc = editDoc(doc, s.id, (e) => withExt(e, 'frequency', { count: f.count, per: f.per }));
      if (doc !== before) updated.push(s.id);
    }
  }
  return { doc, updated, unknown };
}
