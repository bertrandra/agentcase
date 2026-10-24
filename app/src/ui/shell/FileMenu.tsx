import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import '../theme/display.css';
import { toast } from '../uiState';

const save = () => {
  const { filename, json } = exportSnapshotJson(), url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};
const open = async (f: File | undefined) => {
  if (!f) return;
  try { await importSnapshotFile(f); toast('Case opened — Ctrl+Z restores the previous one'); } catch (e) { toast(`Cannot open file: ${(e as Error).message}`, 5000); }
};

/**
 * The file menu of the top bar: an icon-only button (no text) that opens a menu with Save and Open… (WAI-ARIA menu button: the first item takes
 * focus, ↑ ↓ Home End move, Escape or a click outside closes and focus returns to the button).
 */
export function FileMenu() {
  const [isOpen, setOpen] = useState(false), id = useId();
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null), file = useRef<HTMLInputElement>(null);
  const items = () => [...(box.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])];
  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus(); };
  useEffect(() => {
    if (!isOpen) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    items()[0]?.focus();
    return () => document.removeEventListener('mousedown', away);
  }, [isOpen]);
  const onKey = (e: KeyboardEvent) => {
    const list = items(), at = list.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => { e.preventDefault(); list[(i + list.length) % list.length]?.focus(); };
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') go(at + 1);
    else if (e.key === 'ArrowUp') go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Tab') setOpen(false);
  };
  return (
    <div className="ac-display" ref={box} onKeyDown={isOpen ? onKey : undefined}>
      <button ref={btn} type="button" className="ac-icon-btn" aria-label="File" aria-haspopup="menu" aria-expanded={isOpen} aria-controls={id}
        title="File: save or open a case" onClick={() => setOpen((o) => !o)}>📁</button>
      {isOpen && (
        <div className="ac-display-panel ac-file-panel" id={id} role="menu" aria-label="File">
          <button type="button" role="menuitem" title="Save the case as a JSON file" onClick={() => { close(); save(); }}>
            <span aria-hidden="true">💾</span> Save</button>
          <button type="button" role="menuitem" title="Open a case JSON file" onClick={() => { close(false); file.current?.click(); }}>
            <span aria-hidden="true">📂</span> Open…</button>
        </div>
      )}
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
