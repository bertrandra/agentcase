import { useId, useRef, useState } from 'react';
import { importDecisionsFile, importRunCaseFile } from '@/controllers/decisions';
import { readProcessFile, resetProcessTo } from '@/controllers/processImport';
import type { PhaseView } from '@/domain/process';
import { BpmnExportPanel } from '@/ui/shell/BpmnExport';
import { toast } from '@/ui/uiState';
import { fileRead } from './view';

/**
 * The Process section's actions (spec § 8): "Import process (BPMN)…" reads and checks a file, then opens the preview (nothing is written before
 * the user confirms); "Export process (BPMN)…" is the File menu's export dialog (F-B1); "Reset to default process", whole or one phase (F-B19).
 * B7b: the same picker takes a `.dmn` file (the decisions, F-B62) or a `.cmmn` file (the run case read back, F-B63), each one undoable step.
 */
export function Toolbar({ phases }: { phases: PhaseView[] }) {
  const id = useId(), input = useRef<HTMLInputElement>(null), exportBtn = useRef<HTMLButtonElement>(null);
  const [exporting, setExporting] = useState(false), [phase, setPhase] = useState('');
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (/\.(dmn|cmmn)$/i.test(f.name)) {
      const o = await (/\.dmn$/i.test(f.name) ? importDecisionsFile(f) : importRunCaseFile(f));
      toast(o.ok ? o.message : `Cannot import ${f.name}: ${o.errors[0] ?? 'refused'}`, 5000);
      if (input.current) input.current.value = '';
      return;
    }
    const r = await readProcessFile(f);
    fileRead(r);
    if (!r.ok) toast(`Cannot import ${f.name}: ${r.errors[0] ?? 'refused'}`, 5000);
    if (input.current) input.current.value = '';
  };
  const reset = () => {
    resetProcessTo(phase || undefined);
    toast(phase ? `Phase ${phase} reset to the default process (Ctrl+Z undoes)` : 'Process reset to the default (Ctrl+Z undoes)');
  };
  const closeExport = () => { setExporting(false); exportBtn.current?.focus(); };
  return (
    <div className="ac-form-row ac-proc-toolbar">
      <input ref={input} id={`${id}-file`} className="ac-sr" type="file" accept=".bpmn,.xml,.dmn,.cmmn,application/xml,text/xml" tabIndex={-1}
        aria-label="BPMN, DMN or CMMN file to import" onChange={(e) => { void onFile(e.target.files?.[0]); }} />
      <button type="button" onClick={() => input.current?.click()}>Import process (BPMN)…</button>
      <span className="ac-proc-export">
        <button ref={exportBtn} type="button" aria-expanded={exporting} onClick={() => setExporting(!exporting)}>Export process (BPMN)…</button>
        {exporting && <BpmnExportPanel onClose={closeExport} />}
      </span>
      <label htmlFor={`${id}-reset`}>Reset</label>
      <select id={`${id}-reset`} value={phase} onChange={(e) => setPhase(e.target.value)}>
        <option value="">Whole process</option>
        {phases.map((p) => <option key={p.id} value={p.id}>{`Phase ${p.id} · ${p.name}`}</option>)}
      </select>
      <button type="button" onClick={reset}>Reset to default process</button>
    </div>
  );
}
