import { useRef } from 'react';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { setCustomerName, setPersona } from '@/controllers/persona';
import { useDoc, useHistory } from '@/store/hooks';
import { APP_VERSION } from '@/domain/version';
import { toast } from '../uiState';
import { runHistory } from './useShortcuts';

const FALLBACK = [{ id: 'builder', label: 'Builder' }, { id: 'clientcase', label: 'Client case' }, { id: 'admin', label: 'Admin' }, { id: 'advanced', label: 'Advanced' }];

/** Brand, customer, persona, undo/redo and file actions. */
export function TopZone() {
  const customer = useDoc((d) => (d.customerName as string) ?? ''), persona = useDoc((d) => (d.currentPersona as string) ?? 'builder');
  const personas = useDoc((d) => (d.PERSONAS as { id: string; label?: string }[] | undefined) ?? FALLBACK);
  const h = useHistory(), file = useRef<HTMLInputElement>(null);
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
      <strong className="ac-brand">AgentCase <small>v{APP_VERSION}</small></strong>
      <input aria-label="Customer name" className="ac-customer" placeholder="Customer" value={customer} onChange={(e) => setCustomerName(e.target.value)} />
      <select aria-label="Persona" value={persona} onChange={(e) => setPersona(e.target.value)}>
        {personas.map((p) => <option key={p.id} value={p.id}>{p.label ?? p.id}</option>)}
      </select>
      <span className="ac-spacer" />
      <button type="button" disabled={!h.canUndo} onClick={() => runHistory('undo')} title={h.undo.at(-1)?.label ?? 'Nothing to undo'} aria-label="Undo">↶ Undo</button>
      <button type="button" disabled={!h.canRedo} onClick={() => runHistory('redo')} title={h.redo.at(-1)?.label ?? 'Nothing to redo'} aria-label="Redo">↷ Redo</button>
      <button type="button" onClick={save}>Save</button>
      <button type="button" onClick={() => file.current?.click()}>Open…</button>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = ''; }} />
    </header>
  );
}
