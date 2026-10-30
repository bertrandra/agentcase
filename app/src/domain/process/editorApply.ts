/** @calc-zone process-model */
import { mergeEditorDocument } from './editorMerge';
import { withMovedActivities, withNewActivities, withoutDeliverables } from './editorTasks';
import { readProcess } from './read';
import { securityCheck } from './security';
import { kids, NS, type XDocument, type XElement } from './xml';
import { serialize } from './xmlWrite';

/**
 * What an editor save does to the case's process (docs/SPEC_BPMN.md D-B6 b, phase B6): the editor's document merged into the case's tree
 * (`mergeEditorDocument`: unchanged nodes stay the same objects), then checked. Moving shapes, renaming, adding / removing tasks and flows and any
 * BPMN element AgentCase does not model (events, gateways, annotations, data stores, groups…: kept as pass-through, not counted) are accepted.
 * Refused, with a message and nothing written: a change of the process structure AgentCase owns (pools, processes, phases, actors, norms), a task
 * of a rework pair moved to another phase or removed, and a result that fails the F-B10 checks.
 */
export interface EditorOutcome {
  /** The next document; the same object as the case's when nothing changed or the save is refused. */
  doc: XDocument;
  refused: string[];
  added: string[]; removed: string[]; moved: string[]; renamed: string[];
  /** Elements the editor added that AgentCase does not model, by kind (kept in the document, not counted). */
  passThrough: Record<string, number>;
}

const ids = (xs: readonly { id: string }[]): Set<string> => new Set(xs.map((x) => x.id));
const idList = (e: XElement, local: string): string[] => kids(e, NS.bpmn, local).map((x) => x.attrs.find((a) => a.name === 'id')?.value ?? '');
const resourcesOf = (d: XDocument): string[] =>
  [...idList(d.root, 'resource'), ...kids(d.root, NS.bpmn, 'category').map((c) => idList(c, 'categoryValue').join(' '))];
const MODELLED: readonly string[] = [
  'task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask', 'businessRuleTask', 'sendTask', 'receiveTask', 'sequenceFlow',
  'subProcess', 'adHocSubProcess', 'dataObject', 'dataOutputAssociation', 'incoming', 'outgoing', 'BPMNShape', 'BPMNEdge', 'BPMNLabel'];

/** The ids of every element with an id, with its local name. */
function idKinds(e: XElement, out = new Map<string, string>()): Map<string, string> {
  const id = e.attrs.find((a) => a.name === 'id')?.value;
  if (id !== undefined) out.set(id, e.local);
  for (const c of e.children) if (c.kind === 'element') idKinds(c, out);
  return out;
}

/** The structural changes AgentCase refuses from the editor (a message each). */
function refusals(cur: XDocument, next: XDocument, moved: { id: string; to: string }[], removed: string[]): string[] {
  const out: string[] = [], before = readProcess(cur), after = readProcess(next), count = (d: XDocument, l: string) => kids(d.root, NS.bpmn, l).length;
  if (count(next, 'collaboration') !== count(cur, 'collaboration') || count(next, 'process') !== count(cur, 'process')) {
    out.push('Pools and processes cannot be added or removed in the editor: the case holds one process (export it to model a collaboration).');
  }
  const phasesAfter = ids(after.phases), phasesBefore = ids(before.phases);
  for (const p of before.phases) if (!phasesAfter.has(p.id)) out.push(`Phase ${p.id} (${p.name}) cannot be removed in the editor.`);
  for (const p of after.phases) if (!phasesBefore.has(p.id)) out.push(`The new sub-process ${p.id} would be a new phase: phases are not added in the editor.`);
  if (resourcesOf(next).join(' ') !== resourcesOf(cur).join(' ')) out.push('Actors and norms cannot be changed in the editor: use the actor panel.');
  const pairs = [...before.flows.flatMap((f) => (f.rework ? [f.rework] : [])), ...before.reworks];
  const paired = (id: string) => pairs.some((r) => r.activityA === id || r.activityB === id);
  for (const m of moved) if (paired(m.id)) out.push(`Activity ${m.id} belongs to a rework pair: it stays in its phase (the loop would cross phases).`);
  for (const id of removed) if (paired(id)) out.push(`Activity ${id} belongs to a rework pair: remove it from the activity table.`);
  return out;
}

/** The outcome of saving the editor's document `edited` (already read and checked by the B2 reader) onto the case's document `cur`. */
export function applyEditorDocument(cur: XDocument, edited: XDocument): EditorOutcome {
  const merged = mergeEditorDocument(cur, edited);
  const none: EditorOutcome = { doc: cur, refused: [], added: [], removed: [], moved: [], renamed: [], passThrough: {} };
  if (merged === cur) return none;
  const before = readProcess(cur), mid = readProcess(merged), was = new Map(before.activities.map((a) => [a.id, a]));
  const added = mid.activities.filter((a) => !was.has(a.id)).map((a) => a.id), stay = ids(mid.activities);
  const removed = before.activities.filter((a) => !stay.has(a.id)).map((a) => a.id);
  const moved = mid.activities.filter((a) => was.has(a.id) && was.get(a.id)?.phase !== a.phase).map((a) => ({ id: a.id, to: a.phase }));
  const refused = refusals(cur, merged, moved, removed);
  if (refused.length) return { ...none, refused };
  const doc = withoutDeliverables(withMovedActivities(withNewActivities(merged, before, added), moved), removed);
  const sec = securityCheck(serialize(doc));
  if (sec.errors.length) return { ...none, refused: sec.errors.map((e) => `${e.code}: ${e.message}`) };
  const renamed = mid.activities.filter((a) => was.has(a.id) && was.get(a.id)?.name !== a.name).map((a) => a.id);
  const old = idKinds(cur.root), passThrough: Record<string, number> = {};
  for (const [id, kind] of idKinds(doc.root)) if (!old.has(id) && !MODELLED.includes(kind)) passThrough[kind] = (passThrough[kind] ?? 0) + 1;
  return { doc, refused: [], added, removed, moved: moved.map((m) => m.id), renamed, passThrough };
}
