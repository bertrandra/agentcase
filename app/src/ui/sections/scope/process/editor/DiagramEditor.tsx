import { useEffect, useId, useRef, useState } from 'react';
import { EditorPanel } from './EditorPanel';

/**
 * "Edit diagram" (docs/SPEC_BPMN.md § 8, D-B6 b, phase B6): opens the optional BPMN editor under the read-only diagram. bpmn-js is loaded only
 * then (lazily, from the payload embedded in the single file); closing the editor removes it and gives the focus back to this button.
 */
export function DiagramEditor() {
  const [open, setOpen] = useState(false), btn = useRef<HTMLButtonElement>(null), id = useId(), wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) btn.current?.focus();
    wasOpen.current = open;
  }, [open]);
  return (
    <div className="ac-proc-editor-wrap">
      <div className="ac-form-row">
        <button ref={btn} type="button" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>Edit diagram</button>
        <span className="ac-muted">BPMN editor (bpmn-js, loaded on demand): move, rename, add or remove tasks and flows; saved as one undoable step.</span>
      </div>
      {open && <EditorPanel id={id} onClose={() => setOpen(false)} />}
    </div>
  );
}
