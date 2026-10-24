import { useState } from 'react';
import content from '@/content/refshare/io.json';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { downloadText } from '../download';
import { ReportPanel } from './ReportPanel';
import { SaveOpenButtons } from './SaveOpenButtons';
import { SnapshotPanel } from './SnapshotPanel';

const T = content.texts;

/** Save tab: the HTML snapshot (later release, disabled) and the JSON snapshot save / open, wired to the files controller. */
export function SaveTab() {
  const [status, setStatus] = useState('');
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
      <SnapshotPanel />
      <Panel title={T.saveJsonTitle}>
        <p>{T.saveJson}</p>
        <SaveOpenButtons save="⬇️ Save snapshot file" open="⬆️ Open snapshot file…" accept="application/json,.json" fileLabel="Snapshot file" onSave={save} onOpen={open} />
        <div role="status" aria-live="polite" style={{ marginTop: 8 }}>{status && <Callout>{status}</Callout>}</div>
      </Panel>
      <ReportPanel />
    </div>
  );
}
