/** @calc-zone process-model */
import { attr, el, kids, NS, type XDocument, type XElement } from '../xml';
import { activityFacts } from './acts';
import { effortFactors } from './effort';
import { DEFINITIONS_RANK, fitted, insertChild, insertIn, CONTAINER_RANK } from './tree';
import { acOf, indexOf, local, numAttr, str } from './walk';

/**
 * The reusable process library (spec F-B52; phase B5b): patterns modelled once ("code review", "quality gate", "release to production",
 * "regulatory sign-off") as global tasks (`globalTask`, `globalUserTask`, `globalManualTask`, `globalScriptTask`, `globalBusinessRuleTask`) or
 * global processes (a `bpmn:process` no pool shows), called from the delivery process by `callActivity calledElement`. A call counts the effort
 * of what it calls (a global task's `ac:activity effort`; a global process: its tasks' effort × their factors) unless it carries its own.
 * Across products (`withLibrary`): a product's document calls the common document's entries; an entry of the same id in the product's document
 * overrides the common one (the whole-entry rule of F-B20).
 */
export const GLOBAL_TASKS: readonly string[] = ['globalTask', 'globalUserTask', 'globalManualTask', 'globalScriptTask', 'globalBusinessRuleTask'];
const TYPE_OF_GLOBAL: Record<string, string> = { globalUserTask: 'Human', globalManualTask: 'Manual', globalScriptTask: 'Script',
  globalBusinessRuleTask: 'BusinessRule' };
export interface LibraryEntry { id: string; name: string; kind: 'task' | 'process'; element: string; effort: number; type?: string }
export interface CallView { id: string; called: string; resolved: boolean; effort: number; own: boolean }

/** The entries of a document's library: global tasks, and processes no participant shows (the first process is the delivery process). */
export function libraryOf(defs: XElement): LibraryEntry[] {
  const pools = new Set(kids(defs, NS.bpmn, 'collaboration').flatMap((c) => kids(c, NS.bpmn, 'participant')).map((p) => local(attr(p, 'processRef'))));
  const ix = indexOf(defs), facts = activityFacts(defs), f = effortFactors(defs);
  const out: LibraryEntry[] = [];
  for (const e of kids(defs, NS.bpmn)) {
    const id = str(attr(e, 'id'));
    if (GLOBAL_TASKS.includes(e.local)) {
      out.push({ id, name: str(attr(e, 'name')), kind: 'task', element: e.local, effort: numAttr(acOf(e, 'activity'), 'effort') ?? 0,
        type: attr(acOf(e, 'activity') ?? e, 'type') ?? TYPE_OF_GLOBAL[e.local] ?? 'Human' });
    } else if (e.local === 'process' && id !== ix.main && !pools.has(id)) {
      const effort = [...facts.values()].filter((t) => ix.byId.get(t.id)?.process === id).reduce((s, t) => s + t.effort * (f.get(t.id)?.factor ?? 1), 0);
      out.push({ id, name: str(attr(e, 'name')), kind: 'process', element: 'process', effort });
    }
  }
  return out;
}

/** The call activities of a document, resolved against its library (and a common library, entries of the document first). */
export function callsOf(defs: XElement, common: LibraryEntry[] = []): CallView[] {
  const lib = new Map([...common, ...libraryOf(defs)].map((e) => [e.id, e]));
  return indexOf(defs).nodes.filter((n) => n.e.local === 'callActivity').map((n) => {
    const called = local(attr(n.e, 'calledElement')) ?? '', entry = lib.get(called), own = numAttr(acOf(n.e, 'activity'), 'effort');
    return { id: n.id, called, resolved: !!entry, effort: own ?? entry?.effort ?? 0, own: own !== undefined };
  });
}

/**
 * The product's document with the common library entries it calls and does not hold itself (a product's own entry of the same id wins),
 * appended as root elements. The same document when nothing is missing.
 */
export function withLibrary(product: XDocument, common: XDocument): XDocument {
  const have = new Set(libraryOf(product.root).map((e) => e.id)), calls = callsOf(product.root).filter((c) => !have.has(c.called)).map((c) => c.called);
  const wanted = new Set(calls), missing = kids(common.root, NS.bpmn).filter((e) => wanted.has(str(attr(e,
    'id'))) && libraryOf(common.root).some((x) => x.id === attr(e, 'id')));
  return missing.reduce((d, e) => ({ ...d, root: insertChild(d.root, fitted(d.root, e), DEFINITIONS_RANK) }), product);
}

export interface GlobalTaskInput { id: string; name: string; type: 'Human' | 'Manual' | 'Script' | 'BusinessRule' | 'Task'; effort: number; phase: string }
const GLOBAL_OF: Record<string, string> = { Human: 'globalUserTask', Manual: 'globalManualTask', Script: 'globalScriptTask',
  BusinessRule: 'globalBusinessRuleTask', Task: 'globalTask' };
/** A library entry as a global task with its `ac:activity` parameters. */
export function addGlobalTask(d: XDocument, g: GlobalTaskInput): XDocument {
  const type = g.type === 'Task' ? 'Human' : g.type;
  const e = el(`bpmn:${GLOBAL_OF[g.type] as string}`, { id: g.id, name: g.name }, [el('bpmn:extensionElements', {}, [
    el('ac:activity', { type, phase: g.phase, effort: g.effort })])]);
  return insertIn(d, null, e, DEFINITIONS_RANK);
}
/** A call of a library entry in a phase (or any container). */
export function addCall(d: XDocument, container: string, id: string, name: string, called: string): XDocument {
  return insertIn(d, container, el('bpmn:callActivity', { id, name, calledElement: called }), CONTAINER_RANK);
}
