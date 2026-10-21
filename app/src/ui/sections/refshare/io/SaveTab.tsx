import { useRef, useState } from 'react';
import content from '@/content/refshare/io.json';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { downloadText } from '../download';

const T = content.texts;

/** Save tab: the HTML snapshot (later release, disabled) and the JSON snapshot save / open, wired to the files controller. */
export function SaveTab() {
  const [status, setStatus] = useState(''), file = useRef<HTMLInputElement>(null);
  const save = () => {
    const { filename, json } = exportSnapshotJson();
    downloadText(filename, json, 'application/json');
    setStatus(`Saved ${filename}`);
    toast(`Saved ${filename}`);
  };
  const open = async (f: File | undefined) => {
    if (!f) return;
    try { await importSnapshotFile(f); setStatus(`Opened ${f.name} — Ctrl+Z restores the previous case.`); toast('Case opened — Ctrl+Z restores the previous one'); } catch (e) { setStatus(`Cannot open ${f.name}: ${(e as Error).message}`); }
  };
  return (
    <div>
      <Panel title={T.saveHtmlTitle}>
        <p>{T.saveHtml}</p>
        <button type="button" className="ac-btn ac-btn-primary" disabled aria-describedby="io-html-later">💾 Download HTML snapshot</button>
        <p id="io-html-later" className="ac-muted">Available in a later release (single-file HTML snapshot, Phase 6). Use the snapshot file below meanwhile.</p>
      </Panel>
      <Panel title={T.saveJsonTitle}>
        <p>{T.saveJson}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ac-btn ac-btn-primary" onClick={save}>⬇️ Save snapshot file</button>
          <button type="button" className="ac-btn" onClick={() => file.current?.click()}>⬆️ Open snapshot file…</button>
          <input ref={file} type="file" accept="application/json,.json" aria-label="Snapshot file" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div role="status" aria-live="polite" style={{ marginTop: 8 }}>{status && <Callout>{status}</Callout>}</div>
      </Panel>
    </div>
  );
}
