/** @calc-zone process-model */
import { idsOf } from './editTree';
import { adopter, type Adopter } from './importAdopt';
import { lanesOf } from './importForeign';
import { phaseFor } from './importPlan';
import type { ImportAnalysis, ImportChoices } from './importTypes';
import { COLLABORATION_RANK, CONTAINER_RANK, DEFINITIONS_RANK, editDoc, insertIn } from './profile/tree';
import { readProcess } from './read';
import { attr, kid, kids, NS, withAttrs, withChildren, type XDocument, type XElement, type XNode } from './xml';

/**
 * F-B11 for files written outside AgentCase (phase B5b; B4 kept pass-through for AgentCase files only): what the import does not map is kept in
 * the case's process instead of being dropped. Root definitions (messages, errors, escalations, signals, item definitions, data stores, imports)
 * join the definitions; events, gateways, flows, data and annotations of a mapped unit join the phase it maps to, their references following
 * the renamed tasks, when every flow node they name sits in that phase; black-box pools and the message flows between kept ends join the
 * collaboration; the vendor extensions of an added task stay on it. An element whose id the case already uses, or whose references cross phases
 * or point at something not imported, is dropped and counted by kind in `dropped`.
 */
export interface KeepReport { kept: Record<string, number>; dropped: Record<string, number> }
type Doc = XDocument;
const ROOTS: readonly string[] = ['message', 'error', 'escalation', 'signal', 'itemDefinition', 'dataStore', 'interface', 'import'];
const SKIP: readonly string[] = ['task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask', 'businessRuleTask', 'sendTask', 'receiveTask',
  'subProcess', 'adHocSubProcess', 'transaction', 'laneSet', 'extensionElements', 'documentation', 'ioSpecification', 'property',
  // a sub-process's own content model (not its flow elements)
  'incoming', 'outgoing', 'auditing', 'monitoring', 'categoryValueRef', 'dataInputAssociation', 'dataOutputAssociation', 'resourceRole', 'performer',
  'humanPerformer', 'potentialOwner', 'standardLoopCharacteristics', 'multiInstanceLoopCharacteristics', 'correlationSubscription', 'supports'];
const NODE_REFS = ['sourceRef', 'targetRef', 'attachedToRef', 'default'];
const LINK_REFS = ['sourceRef', 'targetRef', 'attachedToRef'];
const NOT_NODES: readonly string[] = ['dataObject', 'dataObjectReference', 'dataStoreReference', 'textAnnotation'];
const bump = (r: Record<string, number>, k: string): void => { r[k] = (r[k] ?? 0) + 1; };

/** The element with its id references renamed (attributes and reference texts) and its incoming / outgoing lists removed. */
function renamed(e: XElement, rename: ReadonlyMap<string, string>): XElement {
  const attrs = e.attrs.map((a) => (NODE_REFS.includes(a.name) && rename.has(a.value) ? { ...a, value: rename.get(a.value) as string } : a));
  const children: XNode[] = e.children.filter((c) => !(c.kind === 'element' && (c.local === 'incoming' || c.local === 'outgoing')))
    .map((c) => (c.kind === 'element' ? renamed(c, rename) : c));
  return { ...e, attrs, children };
}

export function keepForeign(d: Doc, file: Doc, a: ImportAnalysis, c: ImportChoices, rename: ReadonlyMap<string, string>): { doc: Doc; report: KeepReport } {
  const report: KeepReport = { kept: {}, dropped: {} }, used = idsOf(d.root), phaseOf = new Map(readProcess(d).activities.map((x) => [x.id, x.phase]));
  const ad = adopter(file.root, d.root, idsOf(file.root));
  let out = d;
  const take = (e: XElement): boolean => { const id = attr(e, 'id'); if (id !== undefined && used.has(id)) { bump(report.dropped,
    e.local); return false; } if (id) used.add(id); return true; };
  for (const e of kids(file.root, NS.bpmn).filter((x) => ROOTS.includes(x.local))) {
    if (take(e)) { out = insertIn(out, null, ad.adopt(e), DEFINITIONS_RANK); bump(report.kept, e.local); }
  }
  for (const proc of kids(file.root, NS.bpmn, 'process')) {
    const lanes = lanesOf(proc), pid = attr(proc, 'id') ?? '';
    const items: { e: XElement; unit: string }[] = [];
    for (const x of kids(proc, NS.bpmn)) {
      const id = attr(x, 'id') ?? '', lane = lanes.get(id);
      if (x.local === 'subProcess' || x.local === 'adHocSubProcess' || x.local === 'transaction') {
        for (const y of kids(x, NS.bpmn).filter((z) => !SKIP.includes(z.local))) items.push({ e: y, unit: `sub:${id}` });
        for (const y of kids(x, NS.bpmn).filter((z) => ['subProcess', 'adHocSubProcess', 'transaction'].includes(z.local))) bump(report.dropped, y.local);
      } else if (!SKIP.includes(x.local)) items.push({ e: x, unit: lane ? `lane:${lane}` : `process:${pid}` });
    }
    // nodes first (events, gateways, data, annotations), then what links them (flows, associations), so a flow finds its ends placed
    const links = (x: XElement): boolean => x.local === 'sequenceFlow' || x.local === 'association' || x.local === 'dataAssociation';
    for (const it of [...items.filter((i) => !links(i.e)), ...items.filter((i) => links(i.e))]) {
      const e = ad.adopt(renamed(it.e, rename)), refs = LINK_REFS.map((n) => attr(e, n)).filter((v): v is string => !!v);
      const phases = new Set(refs.map((r) => phaseOf.get(r)));
      const phase = refs.length ? (phases.size === 1 ? [...phases][0] : undefined) : phaseFor(a, c, it.unit) ?? undefined;
      if (!phase || !take(e)) { if (!phase) bump(report.dropped, e.local); continue; }
      out = insertIn(out, phase, e, CONTAINER_RANK);
      if (!NOT_NODES.includes(e.local) && attr(e, 'id')) phaseOf.set(attr(e, 'id') as string, phase);
      bump(report.kept, e.local);
    }
  }
  out = keepVendor(keepPools(out, file, rename, used, report, ad), file, rename, ad);
  const decls = ad.declarations();
  return { doc: decls.length ? { ...out, root: { ...out.root, attrs: [...out.root.attrs, ...decls] } } : out, report };
}

/** Black-box pools and the message flows whose ends are kept (a task of the case, or a kept pool). */
function keepPools(d: Doc, file: Doc, rename: ReadonlyMap<string, string>, used: Set<string>, report: KeepReport, ad: Adopter): Doc {
  const collab = kid(d.root, NS.bpmn, 'collaboration'), cid = collab ? attr(collab, 'id') : undefined, fc = kids(file.root, NS.bpmn, 'collaboration');
  if (!cid) return d;
  let out = d;
  const ends = new Set(readProcess(d).activities.map((x) => x.id));
  for (const p of fc.flatMap((x) => kids(x, NS.bpmn, 'participant')).filter((x) => !attr(x, 'processRef'))) {
    const id = attr(p, 'id') ?? '';
    if (used.has(id)) { bump(report.dropped, 'participant'); continue; }
    used.add(id); ends.add(id); out = insertIn(out, cid, ad.adopt(p), COLLABORATION_RANK); bump(report.kept, 'participant');
  }
  for (const f of fc.flatMap((x) => kids(x, NS.bpmn, 'messageFlow'))) {
    const a = ad.adopt(f), s = attr(a, 'sourceRef') ?? '', t = attr(a, 'targetRef') ?? '', s2 = rename.get(s) ?? s, t2 = rename.get(t) ?? t, id = attr(f,
      'id') ?? '';
    if (!ends.has(s2) || !ends.has(t2) || used.has(id)) { bump(report.dropped, 'messageFlow'); continue; }
    used.add(id); out = insertIn(out, cid, withAttrs(a, { sourceRef: s2, targetRef: t2 }), COLLABORATION_RANK); bump(report.kept, 'messageFlow');
  }
  return out;
}

/** The vendor extensions (`extensionElements` content outside `ac:`) of each imported task, kept on the task it became. */
function keepVendor(d: Doc, file: Doc, rename: ReadonlyMap<string, string>, ad: Adopter): Doc {
  const all = (e: XElement): XElement[] => [e, ...kids(e).flatMap(all)];
  let out = d;
  for (const t of all(file.root).filter((e) => e.ns === NS.bpmn && rename.has(attr(e, 'id') ?? ''))) {
    const vendor = kids(t, NS.bpmn, 'extensionElements').flatMap((x) => kids(x)).filter((x) => x.ns !== NS.ac).map(ad.adopt);
    if (!vendor.length) continue;
    out = editDoc(out, rename.get(attr(t, 'id') ?? '') as string, (task) => {
      const x = kid(task, NS.bpmn, 'extensionElements');
      return x ? withChildren(task, task.children.map((ch) => (ch === x ? withChildren(x, [...x.children, ...vendor]) : ch))) : task;
    });
  }
  return out;
}
