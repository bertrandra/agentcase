/**
 * The BPMN editor's save, without a browser (phase B6): bpmn-js's Modeler reads a document with bpmn-moddle and `saveXML` writes the model back
 * with bpmn-moddle (`toXML`). These helpers do the same in node, with an optional edit of the model in between (what a user does on the canvas:
 * move, rename, add, remove), so the write-back is tested against the editor's real serialiser. bpmn-moddle is the editor's own dependency.
 */
import { BpmnModdle } from 'bpmn-moddle';

export interface MEl { $type: string; id?: string; name?: string; $parent?: MEl; [k: string]: unknown }
export interface Moddle { create(type: string, attrs?: Record<string, unknown>): MEl }
export interface Edit { byId: Record<string, MEl>; moddle: Moddle; defs: MEl }
interface Raw extends Moddle {
  fromXML(xml: string): Promise<{ rootElement: MEl; elementsById: Record<string, MEl>; warnings: unknown[] }>;
  toXML(e: MEl, o: { format: boolean }): Promise<{ xml: string }>;
}

/** The text bpmn-js would save for `xml` after `edit` (none: open then save without a change). */
export async function editorSave(xml: string, edit?: (e: Edit) => void): Promise<{ xml: string; warnings: unknown[] }> {
  const moddle = (BpmnModdle as unknown as () => Raw)(), r = await moddle.fromXML(xml);
  edit?.({ byId: r.elementsById, moddle, defs: r.rootElement });
  return { xml: (await moddle.toXML(r.rootElement, { format: true })).xml, warnings: r.warnings };
}

export const list = (e: MEl | undefined, key: string): MEl[] => {
  if (!e) throw new Error(`no element for ${key}`);
  const v = (e[key] ??= []) as MEl[];
  return v;
};
/** The first diagram plane of the definitions. */
export const planeOf = (defs: MEl): MEl => ((list(defs, 'diagrams')[0] as MEl).plane as MEl);
/** Removes an element (by identity) from a list property of its parent. */
export const drop = (parent: MEl | undefined, key: string, e: MEl | undefined): void => {
  const xs = list(parent, key), i = xs.indexOf(e as MEl);
  if (i >= 0) xs.splice(i, 1);
};

/** A task drawn on the canvas in a phase (`type`: a moddle type such as `bpmn:Task`), with its shape. */
export function drawTask(e: Edit, phase: string, id: string, name: string, type = 'bpmn:Task'): MEl {
  const ph = e.byId[phase], t = e.moddle.create(type, { id, name });
  t.$parent = ph;
  list(ph, 'flowElements').push(t);
  const bounds = e.moddle.create('dc:Bounds', { x: 720, y: 3000, width: 100, height: 80 });
  list(planeOf(e.defs), 'planeElement').push(e.moddle.create('bpmndi:BPMNShape', { id: `${id}_di`, bpmnElement: t, bounds }));
  return t;
}
