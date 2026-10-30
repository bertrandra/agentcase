/** @calc-zone process-model */
import { typeOfTask } from '../process/profile/acts';
import { readEvents } from '../process/profile/events';
import { indexOf, isEventSub, tasksOf, type Placed } from '../process/profile/walk';
import { readProcess } from '../process/read';
import { attr, attrsOf, doc, el, NS, type AttrInput, type XDocument, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';

/**
 * The CMMN view of a phase (docs/SPEC_BPMN.md F-B63, decision D-B25; phase B7b): run and support work (L9) is case-like, unordered and event
 * driven. A CMMN 1.1 `definitions` with one `case` per exported phase: its `casePlanModel` holds a plan item per activity of the phase (a
 * `humanTask` performed by its role, or a `task` for agent, script and rule work, typed with `ac:activityType`), a `stage` per sub-process inside it
 * (an event sub-process is repeatable, `repetitionRule`, and carries its `ac:frequency`), and a milestone "<phase> complete" whose sentry waits for
 * every plan item to complete. The roles become `caseRoles`. Deterministic; the ids are the BPMN ids, so the read-back (`read.ts`) maps them.
 */
export const CMMN_NS = 'http://www.omg.org/spec/CMMN/20151109/MODEL';
export const RUN_PHASE = 'L9';
const c = (local: string, attrs: AttrInput = {}, children: readonly XNode[] = []): XElement =>
  ({ kind: 'element', ns: CMMN_NS, local, prefix: 'cmmn', attrs: attrsOf(attrs), children });

interface Item { planItem: XElement; definition: XElement; id: string }

function taskItem(t: Placed, role: string | undefined): Item {
  const type = typeOfTask(t.e), name = attr(t.e, 'name') ?? t.id, human = role !== undefined && !['Agent', 'Script', 'BusinessRule'].includes(type);
  const def = human ? c('humanTask', { id: t.id, name, performerRef: role })
    : c('task', { id: t.id, name, 'ac:activityType': type, 'ac:decisionRef': attr(t.e, 'ac:decisionRef') });
  return { id: `PI_${t.id}`, planItem: c('planItem', { id: `PI_${t.id}`, definitionRef: t.id }), definition: def };
}

/** The `cmmn:case` of one phase (or null when the document has no such phase). */
function caseOf(d: XDocument, phase: string, roles: Map<string, string>): XElement | null {
  const v = readProcess(d), ph = v.phases.find((p) => p.id === phase);
  if (!ph) return null;
  const ix = indexOf(d.root), tasks = tasksOf(ix).filter((t) => t.phase === phase), acts = new Map(v.activities.map((a) => [a.id, a]));
  const freq = new Map(readEvents(d.root).eventSubs.filter((s) => s.frequency).map((s) => [s.id, s.frequency as { count: number; per: string }]));
  const roleOf = (id: string): string | undefined => {
    const r = acts.get(id)?.humanPerformer, name = r ? v.actors.find((a) => a.id === r)?.name : undefined;
    if (r && name !== undefined) roles.set(r, name);
    return r && name !== undefined ? r : undefined;
  };
  const itemsIn = (container: string): Item[] => [
    ...tasks.filter((t) => t.container === container).map((t) => taskItem(t, roleOf(t.id))),
    ...ix.nodes.filter((n) => n.container === container && n.phase === phase && ['subProcess', 'adHocSubProcess'].includes(n.e.local)).map((s) => {
      const inner = itemsIn(s.id), f = freq.get(s.id), repeat = isEventSub(s.e);
      const ext = f ? [c('extensionElements', {}, [el('ac:frequency', { count: f.count, per: f.per })])] : [];
      const control = repeat ? [c('itemControl', {}, [c('repetitionRule')])] : [];
      return { id: `PI_${s.id}`, planItem: c('planItem', { id: `PI_${s.id}`, definitionRef: s.id }, control),
        definition: c('stage', { id: s.id, name: attr(s.e, 'name') ?? s.id, autoComplete: 'true' },
          [...ext, ...inner.map((i) => i.planItem), ...inner.map((i) => i.definition)]) };
    }),
  ];
  const items = itemsIn(phase), ms = `MS_${phase}`, sentry = `S_${phase}`, label = ph.name || phase;
  const done = items.length ? [{ id: `PI_${ms}`, planItem: c('planItem', { id: `PI_${ms}`, definitionRef: ms },
    [c('entryCriterion', { id: `EC_${phase}`, sentryRef: sentry })]), definition: c('milestone', { id: ms, name: `${label} complete` }) }] : [];
  const complete = (): XElement => c('standardEvent', {}, [{ kind: 'text', text: 'complete' }]);
  const onParts = items.map((i, n) => c('planItemOnPart', { id: `${sentry}_${n + 1}`, sourceRef: i.id }, [complete()]));
  const all = [...items, ...done];
  const plan = c('casePlanModel', { id: `CasePlan_${phase}`, name: label, autoComplete: 'true' }, [
    ...all.map((i) => i.planItem), ...(items.length ? [c('sentry', { id: sentry, name: `Every ${label} item complete` }, onParts)] : []),
    ...all.map((i) => i.definition)]);
  return c('case', { id: `Case_${phase}`, name: label }, [plan]);
}

/** The CMMN document of the phases (the run phase L9 by default) of a process document; `version` is the exporter's version. */
export function cmmnDocument(d: XDocument, version: string, phases: string[] = [RUN_PHASE]): XDocument {
  const roles = new Map<string, string>(), cases = phases.map((p) => caseOf(d, p, roles)).filter((x): x is XElement => x !== null);
  const withRoles = cases.map((k, i) => (i === 0 && roles.size
    ? { ...k, children: [...k.children, c('caseRoles', { id: `Roles_${phases[0] ?? RUN_PHASE}` }, [...roles].map(([id, name]) => c('role', { id, name })))] }
    : k));
  const root = c('definitions', { 'xmlns:cmmn': CMMN_NS, 'xmlns:ac': NS.ac, id: `CMMN_${phases.join('_')}`, name: `AgentCase run view (${phases.join(', ')})`,
    targetNamespace: 'https://agentcase.app/schema/cmmn/run', exporter: 'AgentCase', exporterVersion: version }, withRoles);
  return doc(indent(root));
}
