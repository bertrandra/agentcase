import { useRef } from 'react';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { setCustomerName } from '@/controllers/persona';
import { useDoc, useHistory } from '@/store/hooks';
import { APP_VERSION } from '@/domain/version';
import { goSection, setFastPath, toast, toggleMenuHidden, useUi } from '../uiState';
import { useNavModel } from '../zones/navModel';
import { ProductBar } from './ProductBar';
import { switchPersona } from './personaSwitch';
import { runHistory } from './useShortcuts';

/** Brand, customer, persona, undo/redo and file actions. */
export function TopZone() {
  const customer = useDoc((d) => (d.customerName as string) ?? ''), { persona, personas, landing } = useNavModel();
  const hidden = useUi((s) => s.menuHidden), fastPath = useUi((s) => s.fastPath), h = useHistory(), file = useRef<HTMLInputElement>(null);
  const save = () => {
    const { filename, json } = exportSnapshotJson(), url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
  };
  const open = async (f: File | undefined) => {
    if (!f) return;
    try { await importSnapshotFile(f); toast('Case opened — Ctrl+Z restores the previous one'); } catch (e) { toast(`Cannot open file: ${(e as Error).message}`, 5000); }
  };
  return (
    <header className="ac-top" role="banner" style={{ gridArea: 'top' }}>
      <div className="ac-top-id">
        <strong className="ac-brand" title="Back to Welcome" onClick={() => goSection('home')}>AgentCase <small>v{APP_VERSION}</small></strong>
        <p className="ac-subtitle">Agentic Transformation: From Team Baseline to Confidence-Conditional Verdict</p>
      </div>
      <div className="ac-top-ctrls">
        <button type="button" className="ac-icon-btn" aria-label="Toggle the sidebar menu" aria-pressed={!hidden} title="Show or hide the sidebar; hidden, the group bar above the section navigates" onClick={toggleMenuHidden}>☰</button>
        <input aria-label="Customer name" className="ac-customer" placeholder="Customer" value={customer} onChange={(e) => setCustomerName(e.target.value)} />
        <ProductBar />
        <select aria-label="Persona" value={persona} onChange={(e) => switchPersona(e.target.value, landing(e.target.value))}>
          {personas.map((p) => <option key={p.id} value={p.id}>{p.label ?? p.id}</option>)}
        </select>
        <label className="ac-fastpath" title="Fast Path: filter the menu to the minimum-viable-path sections plus Welcome. Untick to restore the full menu.">
          <input type="checkbox" checked={fastPath} onChange={(e) => setFastPath(e.target.checked)} /> Fast Path
        </label>
        <button type="button" disabled={!h.canUndo} onClick={() => runHistory('undo')} title={h.undo.at(-1)?.label ?? 'Nothing to undo'} aria-label="Undo">↶ Undo</button>
        <button type="button" disabled={!h.canRedo} onClick={() => runHistory('redo')} title={h.redo.at(-1)?.label ?? 'Nothing to redo'} aria-label="Redo">↷ Redo</button>
        <button type="button" onClick={save}>Save</button>
        <button type="button" onClick={() => file.current?.click()}>Open…</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </header>
  );
}
