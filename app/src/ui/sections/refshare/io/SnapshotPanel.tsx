import { useRef, useState } from 'react';
import content from '@/content/refshare/io.json';
import { htmlSnapshotFile } from '@/controllers/htmlSnapshot';
import { openCaseFile } from '@/controllers/openFile';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { downloadText } from '../download';

const T = content.texts;
const KIND = { json: 'snapshot file', html: 'HTML snapshot', 'legacy-html': 'v18.x HTML snapshot' } as const;

/** Save the application with the case inside as one HTML file, and open a snapshot file of any kind (this build's HTML, a v18.x HTML, JSON). */
export function SnapshotPanel() {
  const [status, setStatus] = useState(''), [failed, setFailed] = useState(false), file = useRef<HTMLInputElement>(null);
  const say = (msg: string, bad = false) => { setStatus(msg); setFailed(bad); };
  const save = () => {
    try {
      const { filename, html } = htmlSnapshotFile(document.documentElement);
      downloadText(filename, html, 'text/html');
      say(`Snapshot downloaded (${filename}) — reopen the file to resume exactly here.`);
      toast('HTML snapshot downloaded');
    } catch (e) { say(`Snapshot failed: ${(e as Error).message}`, true); }
  };
  const open = async (f: File | undefined) => {
    if (!f) return;
    try { const kind = await openCaseFile(f); say(`Opened ${f.name} (${KIND[kind]}) — Ctrl+Z restores the previous case.`); toast('Case opened — Ctrl+Z restores the previous one'); } catch (e) { say(`Cannot open ${f.name}: ${(e as Error).message}`, true); }
  };
  return (
    <Panel title={T.saveHtmlTitle}>
      <p>{T.saveHtml}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="ac-btn ac-btn-primary" onClick={save}>💾 Download HTML snapshot</button>
        <button type="button" className="ac-btn" onClick={() => file.current?.click()}>⬆️ Open an HTML or JSON snapshot…</button>
        <input ref={file} type="file" accept=".html,.htm,.json,text/html,application/json" aria-label="Snapshot file to open" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <p className="ac-muted">Opening reads the case out of the file; nothing in it is executed. HTML snapshots saved by v18.x open too.</p>
      <div role="status" aria-live="polite" style={{ marginTop: 8 }}>{status && <Callout kind={failed ? 'error' : 'note'}>{status}</Callout>}</div>
    </Panel>
  );
}
