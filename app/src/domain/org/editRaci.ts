/** @calc-zone process-model */
import { appendChild, editById } from '../process/editTree';
import { without } from '../process/partial';
import { readProcess } from '../process/read';
import { attr, el, kid, NS, text, withChildren, type XDocument, type XElement, type XNode } from '../process/xml';
import { indent } from '../process/xmlWrite';
import { RACI_ROLE_NAMES } from './readRaci';
import type { Raci } from './types';

/**
 * The RACI command of an activity (F-B36, § 16.4): writes the standard BPMN resource roles — `bpmn:resourceRole name="Responsible"` for each
 * Responsible role beyond the activity's `humanPerformer`, `name="Accountable" | "Consulted" | "Informed"` — and the `ac:raci` convenience copy for
 * tools that drop role names. The `humanPerformer` (the role that prices the activity, its legacy skill) stays Responsible and is never
 * removed, so no business-case figure moves (phase B6b: RACI-driven figures come later, § 16.5). `clearRaci` goes back to the default RACI.
 */
const isRaciRole = (n: XElement): boolean => n.ns === NS.bpmn && n.local === 'resourceRole'
  && (RACI_ROLE_NAMES as readonly string[]).includes(attr(n, 'name') ?? '');
const isRaciExt = (n: XElement): boolean => n.ns === NS.ac && n.local === 'raci';
const isLoop = (n: XNode): boolean => n.kind === 'element' && n.ns === NS.bpmn && /LoopCharacteristics$/.test(n.local);
const blank = (n: XNode | undefined): boolean => n?.kind === 'text' && !n.text.trim();

/** Depth of an element from the white space that closes it (2 spaces per level, the form every AgentCase document is written in). */
const depthOf = (e: XElement): number => {
  const t = e.children[e.children.length - 1];
  return blank(t) ? Math.max(0, ((t as { text: string }).text.length - 1) / 2) : 0;
};

function roleEl(name: string, ref: string, depth: number): XElement {
  return indent(el('bpmn:resourceRole', { name }, [el('bpmn:resourceRef', {}, [text(ref)])]), '  ', depth + 1);
}

/** The activity element with its RACI written (resource roles before any loop characteristics, the `ac:raci` at the end of its extensions). */
function written(e: XElement, primary: string | undefined, r: Raci): XElement {
  const depth = depthOf(e), cs = without(e.children, isRaciRole), roles: XElement[] = [
    ...r.R.filter((x) => x !== primary).map((x) => roleEl('Responsible', x, depth)), ...(r.A ? [roleEl('Accountable', r.A, depth)] : []),
    ...r.C.map((x) => roleEl('Consulted', x, depth)), ...r.I.map((x) => roleEl('Informed', x, depth))];
  const loop = cs.findIndex(isLoop), pad = text(`\n${'  '.repeat(depth + 1)}`);
  let next: XElement = withChildren(e, cs);
  if (loop >= 0) next = withChildren(e, [...cs.slice(0, loop), ...roles.flatMap((x) => [x, pad]), ...cs.slice(loop)]);
  else for (const x of roles) next = appendChild(next, x);
  const ext = kid(next, NS.bpmn, 'extensionElements');
  if (!ext) return next;
  const copy = el('ac:raci', { responsible: r.R.join(' '), accountable: r.A, consulted: r.C.join(' ') || null, informed: r.I.join(' ') || null });
  const ext2 = appendChild(withChildren(ext, without(ext.children, isRaciExt)), copy);
  return withChildren(next, next.children.map((c) => (c === ext ? ext2 : c)));
}

/**
 * Set the RACI of an activity. The activity's `humanPerformer` is kept first among the Responsible; ids must name resources of the document; at
 * least one Responsible. Refused (same document) otherwise or for an unknown activity.
 */
export function setRaci(d: XDocument, activityId: string, raci: Raci): XDocument {
  const v = readProcess(d), a = v.activities.find((x) => x.id === activityId), known = new Set(v.actors.map((x) => x.id));
  if (!a) return d;
  const primary = a.humanPerformer || undefined, uniq = (xs: string[]) => [...new Set(xs)];
  const r: Raci = { R: uniq([...(primary ? [primary] : []), ...raci.R]), C: uniq(raci.C), I: uniq(raci.I) };
  if (raci.A) r.A = raci.A;
  if (!r.R.length || ![...r.R, ...(r.A ? [r.A] : []), ...r.C, ...r.I].every((x) => known.has(x))) return d;
  const root = editById(d.root, activityId, (e) => written(e, primary, r));
  return root === d.root ? d : { ...d, root };
}

/** Back to the default RACI (the legacy skill): the resource roles and the `ac:raci` copy removed. */
export function clearRaci(d: XDocument, activityId: string): XDocument {
  const root = editById(d.root, activityId, (e) => {
    const ext = kid(e, NS.bpmn, 'extensionElements'), cs = without(e.children, isRaciRole);
    return withChildren(e, cs.map((c) => (c === ext ? withChildren(ext, without(ext.children, isRaciExt)) : c)));
  });
  return root === d.root ? d : { ...d, root };
}
