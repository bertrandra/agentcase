import { useRef, useState } from 'react';
import content from '@/content/refshare/io.json';
import { exportParamsWorkbook, importParamsWorkbook, type ParamsFile } from '@/controllers/excelParams';
import { toast } from '@/ui/uiState';
import { LEGACY_SECTIONS } from '@/ui/zones/registry';
import { Callout, Panel } from '@/ui/widgets/cards';
import { ParamsNote } from './PortfolioNotes';

const T = content.texts;
/** The section catalogue travels with the workbook calls: the store layer must not import the UI's registry. */
/** The case sheets describe the 79 case sections; the portfolio sheets (Products, Waves, ...) come from the store and need no section catalogue. */
const ENV = { sections: LEGACY_SECTIONS };
const EXPORTS = [
  { scope: 'all', label: '⬇️ Export all', hint: 'Full workbook — every sheet (parameters, team, scope, personas, Factory meta-model, …).' },
  { scope: 'no-factory', label: '⬇️ Export all except Factory', hint: 'Everything except the Factory meta-model (FM…) sheets.' },
  { scope: 'persona-only', label: '⬇️ Export persona config only', hint: 'Only the persona and section configuration sheets, including the dependency edges (plus a JSON copy).' },
] as const;

function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
interface Status { kind: 'note' | 'warn' | 'error'; text: string; notes?: string[] }

/** Settings tab: export the parameters workbook (three scopes) and import one back as a single undoable step. */
export function ParamsExcelPanel() {
  const [status, setStatus] = useState<Status | null>(null), [busy, setBusy] = useState(false), file = useRef<HTMLInputElement>(null);
  const run = async (scope: (typeof EXPORTS)[number]['scope']) => {
    setBusy(true);
    try {
      const out = await exportParamsWorkbook(scope, ENV);
      saveBlob(out.filename, out.blob);
      if (out.companion) saveBlob(out.companion.filename, out.companion.blob);
      setStatus({ kind: 'note', text: `✓ Exported ${out.filename}` }); toast(`Exported ${out.filename}`);
    } catch (e) { setStatus({ kind: 'error', text: `✗ Export failed: ${(e as Error).message}` }); } finally { setBusy(false); }
  };
  const load = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setStatus({ kind: 'note', text: 'Reading…' });
    try {
      const r = await importParamsWorkbook(f as ParamsFile, ENV);
      setStatus({ kind: r.notes.length ? 'warn' : 'note', text: `✓ Imported successfully${r.notes.length ? '' : ' — all values within constraints'}. Ctrl+Z undoes the whole import.`, notes: r.notes });
      toast('Parameters imported — Ctrl+Z undoes it');
    } catch (e) { setStatus({ kind: 'error', text: `✗ Import failed: ${(e as Error).message}. The case was not changed.` }); } finally { setBusy(false); }
  };
  return (
    <div>
      <p>{T.settingsIntro}</p>
      <ParamsNote />
      <Panel title={T.exportTitle}>
        <p>{T.exportText}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EXPORTS.map((x) => <button key={x.scope} type="button" className="ac-btn" disabled={busy} title={x.hint} onClick={() => void run(x.scope)}>{x.label}</button>)}
        </div>
      </Panel>
      <Panel title={T.importTitle}>
        <p>{T.importText}</p>
        <button type="button" className="ac-btn" disabled={busy} onClick={() => file.current?.click()}>⬆️ Import parameters…</button>
        <input ref={file} type="file" accept=".xlsx" aria-label="Settings workbook (.xlsx)" hidden onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ''; }} />
      </Panel>
      <div role="status" aria-live="polite" style={{ marginTop: 8 }}>
        {status && <Callout kind={status.kind}>{status.text}{status.notes && status.notes.length > 0 && <ul>{status.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}</Callout>}
      </div>
    </div>
  );
}
