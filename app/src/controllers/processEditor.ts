/** @calc-zone scope-automation */
import { applyEditorDocument, serialize, type EditorOutcome, type XDocument } from '@/domain/process';
import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { editBase } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { editProcess } from '@/store/processEdit';

/**
 * The BPMN editor's write-back (docs/SPEC_BPMN.md D-B6 b, phase B6). The editor (bpmn-js, loaded on demand by the Process section) opens the
 * case's document as XML text and saves a whole document; that text goes through the B2 reader and the F-B10 checks (`parseBpmn`), is merged into
 * the case's tree (`applyEditorDocument`: unchanged nodes kept, AgentCase's structure guarded, the result checked again) and lands as ONE undoable
 * command, `process.applyEditor`. A save without a change is no command; a refused save writes nothing and says why.
 */
const applyCmd = defineCommand<{ edited: XDocument }>({
  type: 'process.applyEditor', label: () => 'Edit the process diagram (BPMN editor)',
  run(d, p) { editProcess(d, (doc) => applyEditorDocument(doc, p.edited).doc); refitPotential(d); },
});

/** The document the editor opens: the case's process as stored (the product shown, in a portfolio), and its text. */
export const editorBase = (): XDocument => editBase().BPMN;
export const editorSource = (): string => serialize(editorBase());

export type EditorSaveStatus = 'unchanged' | 'applied' | 'refused';
export interface EditorSave { status: EditorSaveStatus; messages: string[] }

const n = (k: number, one: string): string => `${k} ${one}${k === 1 ? '' : 's'}`;
/** What an applied save did, in a few sentences (the report of the Process section). */
function summary(o: EditorOutcome): string[] {
  const out: string[] = [];
  if (o.added.length) out.push(`${n(o.added.length, 'activity')} added (${o.added.join(', ')}), with the parameters of their phase: review them in the table.`);
  if (o.removed.length) out.push(`${n(o.removed.length, 'activity')} removed (${o.removed.join(', ')}).`);
  if (o.moved.length) out.push(`${n(o.moved.length, 'activity')} moved to another phase (${o.moved.join(', ')}).`);
  if (o.renamed.length) out.push(`${n(o.renamed.length, 'activity')} renamed.`);
  const kept = Object.entries(o.passThrough).map(([k, v]) => `${v} ${k}`);
  if (kept.length) out.push(`Kept in the model, not counted in the figures: ${kept.join(', ')}.`);
  return out.length ? out : ['The diagram was updated (layout and labels).'];
}

export const STALE = 'The process changed while the editor was open (an undo or an edit elsewhere): reload the editor from the case, then redo the change.';
/**
 * Saves the editor's text onto the case's process: one undoable step when something changed, nothing written when unchanged or refused. `base`:
 * the document the editor opened; the save is refused when the case's process is no longer that one (the editor's text would undo the other edit).
 */
export function saveEditorXml(xml: string, base?: XDocument | null): EditorSave {
  const cur = editorBase();
  if (base && base !== cur) return { status: 'refused', messages: [STALE] };
  const r = parseBpmn(xml);
  if (!r.doc) return { status: 'refused', messages: r.errors.map((e) => e.message) };
  const o = applyEditorDocument(cur, r.doc);
  if (o.refused.length) return { status: 'refused', messages: o.refused };
  if (o.doc === cur) return { status: 'unchanged', messages: ['No change to save.'] };
  appStore().dispatch(applyCmd({ edited: r.doc }));
  return { status: 'applied', messages: summary(o) };
}
