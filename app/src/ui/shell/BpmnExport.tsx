import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { BPMN_MIME, bpmnExportChoices, exportProcessFiles, type BpmnExportMode } from '@/controllers/bpmn';
import { toast } from '../uiState';

const download = (filename: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: BPMN_MIME }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};

/**
 * "Export process (BPMN)" (docs/SPEC_BPMN.md F-B1, F-B3, F-B5): a small dialog under the File button. A single case exports at once with the
 * in-scope option; a portfolio adds the choice of the product shown, one file per product, or one file with one pool per product.
 * A case with audit data adds "Include audit data" (F-B33, D-B14: off by default). Escape or Cancel closes it and focus returns to the File
 * button (`onClose`).
 */
export function BpmnExportPanel({ onClose }: { onClose: () => void }) {
  const { portfolio, products, shown, audit: hasAudit } = bpmnExportChoices(), id = useId(), box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<BpmnExportMode>('shown'), [partial, setPartial] = useState(false), [audit, setAudit] = useState(false);
  useEffect(() => { box.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  const run = () => {
    try {
      const files = exportProcessFiles(mode, partial, new Date(), audit);
      for (const f of files) download(f.filename, f.text);
      toast(files.length === 1 ? `Exported ${files[0]?.filename ?? ''}` : `Exported ${files.length} BPMN files`);
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
      <p className="ac-display-note">BPMN 2.0 with diagram, AgentCase parameters and BPSim data. The in-scope file cannot replace a full process on import.</p>
      <div className="ac-bpmn-actions">
        <button type="button" className="ac-btn" onClick={run}>Export</button>
        <button type="button" className="ac-btn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
