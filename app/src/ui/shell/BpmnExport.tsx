import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { BPMN_MIME, bpmnExportChoices, exportProcessFiles, type BpmnExportMode, type ProcessChoice } from '@/controllers/bpmn';
import { companionFiles, dmnBindingState, hasDecisions } from '@/controllers/decisionFiles';
import { toast } from '../uiState';

const download = (filename: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: BPMN_MIME }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

/**
 * "Export process (BPMN)" (docs/SPEC_BPMN.md F-B1, F-B3, F-B5): a small dialog under the File button. A single case exports at once with the
 * in-scope option; a portfolio adds the choice of the product shown, one file per product, or one file with one pool per product.
 * A case with audit data adds "Include audit data" (F-B33, D-B14: off by default). B7b: the decisions of the case shown as a `.dmn` file
 * (F-B62; checked when its process holds decisions) and its run phase as a `.cmmn` file (F-B63). Escape or Cancel closes it and focus
 * returns to the File button (`onClose`). Processes (F-B69, phase B9a): the delivery process (default), the transformation programme, or
 * both in one file.
 */
export function BpmnExportPanel({ onClose }: { onClose: () => void }) {
  const { portfolio, products, shown, audit: hasAudit } = bpmnExportChoices(), id = useId(), box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<BpmnExportMode>('shown'), [partial, setPartial] = useState(false), [audit, setAudit] = useState(false);
  const [dmn, setDmn] = useState(hasDecisions), [cmmn, setCmmn] = useState(false);
  const [processes, setProcesses] = useState<ProcessChoice>('delivery');
  useEffect(() => { box.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  const run = () => {
    try {
      const bpmn = exportProcessFiles(mode, partial, new Date(), audit, processes);
      const files = [...bpmn, ...companionFiles(bpmn[0]?.filename ?? 'AgentCase_process.bpmn', { dmn, cmmn })];
      for (const f of files) download(f.filename, f.text);
      toast(files.length === 1 ? `Exported ${files[0]?.filename ?? ''}` : `Exported ${files.length} files`);
      onClose();
    } catch (e) { toast(`Cannot export the process: ${(e as Error).message}`, 5000); }
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
  const choice = (m: BpmnExportMode, label: string) => (
    <label><input type="radio" name={`${id}-mode`} checked={mode === m} onChange={() => setMode(m)} /> {label}</label>
  );
  return (
    <div ref={box} className="ac-display-panel ac-bpmn-panel" role="dialog" aria-labelledby={`${id}-t`} onKeyDown={onKey}>
      <p id={`${id}-t`} className="ac-bpmn-title">Export process (BPMN)</p>
      {portfolio && (
        <fieldset>
          <legend>Products</legend>
          {choice('shown', `Product shown${shown ? ` (${shown})` : ''}`)}
          {choice('perProduct', `One file per product (${products})`)}
          {choice('collaboration', 'One file, one pool per product')}
        </fieldset>
      )}
      <label><input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} /> In-scope activities only</label>
      {hasAudit && <label><input type="checkbox" checked={audit} onChange={(e) => setAudit(e.target.checked)} /> Include audit data (client data: off by
        default, the file name says so)</label>}
      <fieldset>
        <legend>Processes</legend>
        {([['delivery', 'Delivery process'], ['programme', 'Transformation programme'], ['both', 'Both, in one file']] as const).map(([p, label]) => (
          <label key={p}><input type="radio" name={`${id}-proc`} checked={processes === p} onChange={() => setProcesses(p)} /> {label}</label>))}
      </fieldset>
      <label><input type="checkbox" checked={dmn} onChange={(e) => setDmn(e.target.checked)} /> Decisions as a DMN file (.dmn)</label>
      {dmn && <DmnNote />}
      <label><input type="checkbox" checked={cmmn} onChange={(e) => setCmmn(e.target.checked)} /> Run phase as a CMMN case (.cmmn)</label>
      <p className="ac-display-note">BPMN 2.0 with diagram, AgentCase parameters and BPSim data. The in-scope file cannot replace a full process on import.
        The DMN and CMMN files describe the case shown.</p>
      <div className="ac-bpmn-actions">
        <button type="button" className="ac-btn" onClick={run}>Export</button>
        <button type="button" className="ac-btn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/**
 * FX-27: what the exported decisions do — a decision applies to an activity only through a business-rule task bound to it (🧩 Process); the unbound
 * ones (all of them when the case exports its rule families) are reference only until bound.
 */
function DmnNote() {
  const s = dmnBindingState();
  if (!s.unbound) return null;
  return (
    <p className="ac-display-note" role="note">
      {s.generated ? `The ${s.decisions} rule families are exported as reference: none applies until a business-rule task is bound to it.`
        : `${s.unbound} of the ${s.decisions} decisions are bound to no business-rule task: they apply to nothing until one is.`}
    </p>
  );
}
