import { useRef, useState } from 'react';
import { exportDdPack, importDdPack } from '@/controllers/excelDd';
import { toast } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';

/** Export the register as an Excel pack for the client to annotate, and re-import the annotated copy (State / Owner / Due date / Note only). */
export function PackButtons() {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null), input = useRef<HTMLInputElement>(null);
  const save = async () => {
    try {
      const { blob, filename } = await exportDdPack((id) => sectionById(id)?.label ?? id), url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: filename }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus({ ok: true, text: `Saved ${filename}` });
    } catch (e) { setStatus({ ok: false, text: `Due-diligence pack export failed: ${e instanceof Error ? e.message : String(e)}` }); }
  };
  const load = async (f: File | undefined) => {
    if (!f) return;
    setStatus({ ok: true, text: 'Reading…' });
    const r = await importDdPack(f);
    setStatus({ ok: r.ok, text: r.message });
    if (r.ok) toast('Pack imported — Ctrl+Z restores the previous register');
  };
  return (
    <div className="ac-form-row">
      <button type="button" className="ac-btn" onClick={() => void save()}>📤 Export pack (Excel)</button>
      <button type="button" className="ac-btn" onClick={() => input.current?.click()}>📥 Re-import annotated pack</button>
      <input ref={input} type="file" accept=".xlsx" aria-label="Annotated due-diligence pack (.xlsx)" hidden onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ''; }} />
      <span role="status" aria-live="polite" className={status && !status.ok ? 'ac-muted ac-alert-text' : 'ac-muted'}>{status?.text}</span>
    </div>
  );
}
