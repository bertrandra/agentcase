/** @calc-zone process-model */
import { dataId } from './ids';
import { mapElements } from './order';
import { NS, attr, el, kid, withAttrs, withChildren, type XElement, type XNode } from './xml';

const TASKS: readonly string[] = ['task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask', 'businessRuleTask', 'sendTask', 'receiveTask'];
const PHASES: readonly string[] = ['subProcess', 'adHocSubProcess'];
const isBpmn = (e: XElement, locals: readonly string[]): boolean => e.ns === NS.bpmn && locals.includes(e.local);
const off = (e: XElement): boolean => attr(e, 'ac:inScope') === 'false';

/** The ids of the out-of-scope activities: marked out of scope, or inside a phase switched off; and their deliverables. */
function outOfScope(defs: XElement): Set<string> {
  const ids = new Set<string>();
  const walk = (e: XElement, phaseOff: boolean): void => {
    for (const c of e.children) {
      if (c.kind !== 'element') continue;
      const id = attr(c, 'id') ?? '';
      if (isBpmn(c, TASKS) && (phaseOff || off(c))) ids.add(id).add(dataId(id));
      walk(c, phaseOff || (isBpmn(c, PHASES) && off(c)));
    }
  };
  walk(defs, false);
  return ids;
}

/** Children without the removed elements and the white space written just before each of them. */
export function without(children: readonly XNode[], gone: (e: XElement) => boolean): XNode[] {
  const out: XNode[] = [];
  for (const c of children) {
    if (c.kind === 'element' && gone(c)) { const last = out[out.length - 1]; if (last?.kind === 'text' && !last.text.trim()) out.pop(); continue; }
    out.push(c);
  }
  return out;
}

/**
 * The in-scope-only export (F-B3): out-of-scope activities are left out with their deliverables, the flows that touch them and their diagram
 * shapes and edges; the file says so (`ac:partial="true"` on the definitions and `partial="true"` on `ac:process`), and the importer refuses
 * it as a replacement of a full model. Phases, norms and actors stay (the structure of the process).
 */
export function partialOf(root: XElement): XElement {
  const ids = outOfScope(root);
  const gone = (e: XElement): boolean => {
    const id = attr(e, 'id') ?? '';
    if (ids.has(id)) return true;
    if (e.ns === NS.bpmn && e.local === 'sequenceFlow') return ids.has(attr(e, 'sourceRef') ?? '') || ids.has(attr(e, 'targetRef') ?? '');
    return e.ns === NS.bpmndi && ids.has(attr(e, 'bpmnElement') ?? '');
  };
  const flowIds = new Set<string>();
  mapElements(root, (e) => { if (e.ns === NS.bpmn && e.local === 'sequenceFlow' && gone(e)) flowIds.add(attr(e, 'id') ?? ''); return e; });
  for (const f of flowIds) ids.add(f);
  const pruned = mapElements(root, (e) => {
    const x = withChildren(e, without(e.children, gone));
    return x.ns === NS.ac && x.local === 'process' ? withAttrs(x, { partial: 'true' }) : x;
  });
  return withAttrs(pruned, { 'ac:partial': 'true' });
}

/** Adds the product header (`ac:product code name`, spec § 5.2) after `ac:process` in each `bpmn:process` of the document. */
export function withProduct(root: XElement, code: string, name: string): XElement {
  const product = el('ac:product', { code, name: name.replace(/\s+/g, ' ').trim().slice(0, 200) || code });
  return mapElements(root, (e) => {
    if (e.ns !== NS.bpmn || e.local !== 'extensionElements') return e;
    const at = e.children.findIndex((c) => c.kind === 'element' && c.ns === NS.ac && c.local === 'process');
    if (at < 0 || kid(e, NS.ac, 'product')) return e;
    const pad = e.children[at - 1], ws = pad?.kind === 'text' && !pad.text.trim() ? [pad] : [];
    return withChildren(e, [...e.children.slice(0, at + 1), ...ws, product, ...e.children.slice(at + 1)]);
  });
}
