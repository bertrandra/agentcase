import { useEffect, useId, useRef, useState, type KeyboardEvent, type MutableRefObject } from 'react';
import { editorBase, editorDiagrams, editorSource, saveEditorXml } from '@/controllers/processEditor';
import { bpmnSource, type BpmnModeler } from '@/controllers/processEditorKit';
import type { XDocument } from '@/domain/process';
import { useDoc } from '@/store/hooks';
import { shouldHandle } from '@/ui/shell/useShortcuts';

/**
 * The BPMN editor of the Process section (docs/SPEC_BPMN.md D-B6 b, phase B6): bpmn-js's Modeler, loaded on demand, opened on the case's process
 * document. "Save to the case" hands the editor's document to the write-back (one undoable step, `process.applyEditor`); the editor stays open
 * as it is, with its own undo history (FX-13). A document with several diagrams offers a picker (FX-14). The bpmn.io watermark the bpmn-js
 * licence requires stays visible: nothing here hides or covers it. Ctrl+Z on the canvas is the editor's own undo, not the case's.
 */
type Status = 'loading' | 'ready' | 'failed';
interface Canvas { zoom(v: string): void; viewbox(box?: object): object }
interface Refs {
  m: MutableRefObject<BpmnModeler | null>; base: MutableRefObject<XDocument | null>; dirty: MutableRefObject<boolean>; diagram: MutableRefObject<string>;
}

/** Opens the case's current document in the editor (keeping the view when asked); the editor is clean afterwards. */
async function load(r: Refs, keepView: boolean): Promise<void> {
  const m = r.m.current;
  if (!m) return;
  const canvas = m.get('canvas') as Canvas, view = keepView ? canvas.viewbox() : null;
  r.base.current = editorBase();
  await (r.diagram.current ? m.importXML(editorSource(), r.diagram.current) : m.importXML(editorSource()));
  if (view) canvas.viewbox(view); else canvas.zoom('fit-viewport');
  r.dirty.current = false;
}

export function EditorPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null), title = useRef<HTMLHeadingElement>(null), hid = useId(), doc = useDoc((d) => d.BPMN);
  const refs: Refs = { m: useRef<BpmnModeler | null>(null), base: useRef<XDocument | null>(null), dirty: useRef(false), diagram: useRef('') };
  const diagrams = editorDiagrams(), [diagram, setDiagram] = useState('');
  const [status, setStatus] = useState<Status>('loading'), [msg, setMsg] = useState<string[]>([]), [stale, setStale] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    let alive = true, style: HTMLStyleElement | null = null, m: BpmnModeler | null = null;
    title.current?.focus();
    bpmnSource().then(async (kit) => {
      if (!alive || !host.current) return;
      style = document.createElement('style');
      style.setAttribute('data-ac-bpmn-editor', '');
      style.setAttribute('data-transient', '');   // not copied into an HTML snapshot
      style.textContent = kit.css;
      document.head.appendChild(style);
      m = new kit.Modeler({ container: host.current });
      refs.m.current = m;
      m.on('commandStack.changed', () => { refs.dirty.current = true; setArmed(false); });
      await load(refs, false);
      if (alive) setStatus('ready');
    }).catch((e: unknown) => { if (alive) { setStatus('failed'); setMsg([e instanceof Error ? e.message : String(e)]); } });
    return () => { alive = false; m?.destroy(); refs.m.current = null; style?.remove(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps -- once per opening: the refs are stable
  useEffect(() => {   // the case changed elsewhere (undo, the table): a clean editor follows it, an edited one says so
    if (status !== 'ready' || doc === refs.base.current) return;
    if (refs.dirty.current) setStale(true); else void load(refs, true);
  }, [doc, status]);   // eslint-disable-line react-hooks/exhaustive-deps -- the refs are stable
  const save = async () => {
    const m = refs.m.current;
    if (!m) return;
    const { xml = '' } = await m.saveXML({ format: false }), r = saveEditorXml(xml, refs.base.current);
    setMsg(r.status === 'refused' ? ['Not saved:', ...r.messages] : r.messages);
    // FX-13: the editor stays as it is after a save (its own undo history kept); it now edits the case's new process
    if (r.status === 'applied') { refs.base.current = editorBase(); refs.dirty.current = false; }
  };
  const pick = async (v: string) => {   // FX-14: open another diagram of the document (unsaved changes are kept only by saving first)
    setDiagram(v); refs.diagram.current = v; setMsg([]); await load(refs, false);
  };
  const reload = async () => { setStale(false); setMsg([]); await load(refs, true); };
  const close = () => { if (refs.dirty.current && !armed) { setArmed(true); return; } onClose(); };
  const onKey = (e: KeyboardEvent) => { if (host.current?.contains(e.target as Node) && shouldHandle(e.nativeEvent)) e.stopPropagation(); };
  return (
    <section id={id} className="ac-proc-editor" aria-labelledby={hid} onKeyDown={onKey}>
      <h2 id={hid} ref={title} tabIndex={-1}>Diagram editor</h2>
      <div className="ac-form-row" role="toolbar" aria-label="Diagram editor actions">
        <button type="button" disabled={status !== 'ready'} onClick={() => { void save(); }}>Save to the case</button>
        <button type="button" disabled={status !== 'ready'} onClick={() => { void reload(); }}>Reload from the case</button>
        <button type="button" onClick={close}>{armed ? 'Close and discard the changes' : 'Close editor'}</button>
        {diagrams.length > 1 && <label>Diagram{' '}
          <select value={diagram} disabled={status !== 'ready'} onChange={(e) => { void pick(e.target.value); }}>
            {diagrams.map((d, i) => <option key={d.id} value={i === 0 ? '' : d.id}>{d.name}</option>)}
          </select></label>}
      </div>
      <p className="ac-proc-live" aria-live="polite">
        {status === 'loading' ? 'Loading the editor…' : armed ? 'The editor has changes not saved to the case.' : msg.join(' ')}
      </p>
      {stale && <p className="ac-proc-warn">The process changed outside the editor: reload it to edit the current process (its unsaved changes are lost).</p>}
      <div ref={host} className="ac-proc-editor-canvas" role="group" aria-label="BPMN editor canvas (bpmn-js): Tab or click focuses it" />
    </section>
  );
}
