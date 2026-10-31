import { memo, useId, useRef, useState } from 'react';
import { auditReportFile, auditTemplate, catalogFile, importAuditWorkbook, importCatalogFile } from '@/controllers/auditFiles';
import { toast } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { downloadBlob, downloadText } from '../../refshare/download';
import { setImportReport, useAuditView } from './view';

/**
 * The audit's files (F-B26, F-B32, F-B34): the audit workbook out and back in (validated before anything is written, one step, a report of
 * added / updated / ignored rows), the audit report, and the tool catalogue as JSON. Every file with audit data says so in its name.
 */
export const Toolbar = memo(function Toolbar() {
  const id = useId(), wb = useRef<HTMLInputElement>(null), cat = useRef<HTMLInputElement>(null), report = useAuditView((s) => s.report);
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    try { await f(); } catch (e) { toast(`Failed: ${(e as Error).message}`, 5000); } finally { setBusy(false); }
  };
  const template = () => run(async () => { const t = await auditTemplate(); downloadBlob(t.filename, t.blob); toast(`Downloaded ${t.filename}`); });
  const onWorkbook = (f: File | undefined) => f && run(async () => {
    const r = await importAuditWorkbook(f);
    setImportReport(r);
    toast(r.ops.length ? `Audit workbook imported (Ctrl+Z undoes): ${r.added} added, ${r.updated} updated, ${r.ignored} ignored`
      : `Nothing to import from ${f.name}`, 5000);
    if (wb.current) wb.current.value = '';
  });
  const onCatalogue = (f: File | undefined) => f && run(async () => {
    const r = await importCatalogFile(f);
    toast(`Tool catalogue: ${r.taken} entr${r.taken === 1 ? 'y' : 'ies'} taken, ${r.refused} refused`, 5000);
    if (cat.current) cat.current.value = '';
  });
  const printReport = () => { const r = auditReportFile(); downloadText(r.filename, r.html, 'text/html'); toast(`Downloaded ${r.filename}`); };
  const exportCatalogue = () => { const c = catalogFile(); downloadText(c.filename, c.json, 'application/json'); toast(`Downloaded ${c.filename}`); };
  return (
    <section aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>Files</h2>
      <div className="ac-form-row ac-audit-toolbar">
        <button type="button" disabled={busy} onClick={() => { void template(); }}>⬇️ Export audit template (Excel)</button>
        <input ref={wb} className="ac-sr" type="file" tabIndex={-1} aria-label="Audit workbook to import" accept=".xlsx"
          onChange={(e) => { void onWorkbook(e.target.files?.[0]); }} />
        <button type="button" disabled={busy} onClick={() => wb.current?.click()}>⬆️ Import audit workbook…</button>
        <button type="button" onClick={printReport}>🖨️ Audit report</button>
        <button type="button" onClick={exportCatalogue}>⬇️ Tool catalogue (JSON)</button>
        <input ref={cat} className="ac-sr" type="file" tabIndex={-1} aria-label="Tool catalogue JSON to import" accept=".json,application/json"
          onChange={(e) => { void onCatalogue(e.target.files?.[0]); }} />
        <button type="button" disabled={busy} onClick={() => cat.current?.click()}>⬆️ Import tool catalogue…</button>
      </div>
      <p className="ac-muted">The workbook, the report and a BPMN export with audit data contain client information: their file names say so.</p>
      <div role="status" aria-live="polite">
        {report && <Callout kind={report.ignored ? 'warn' : 'note'}>
          Last import: {report.added} row(s) added, {report.updated} updated, {report.ignored} ignored, {report.unchanged} unchanged.
          {report.notes.length > 0 && <ul>{report.notes.slice(0, 12).map((n) => <li key={n}>{n}</li>)}</ul>}
          <button type="button" onClick={() => setImportReport(null)}>Close</button>
        </Callout>}
      </div>
    </section>
  );
});
