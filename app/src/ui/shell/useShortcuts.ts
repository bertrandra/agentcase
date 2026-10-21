import { useEffect } from 'react';
import { redo, undo } from '@/controllers/history';
import { toast } from '../uiState';

/** Text fields keep their native undo; everywhere else Ctrl/Cmd+Z undoes the case, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. */
export function shouldHandle(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>): 'undo' | 'redo' | null {
  if (!(e.ctrlKey || e.metaKey)) return null;
  const t = e.target as HTMLElement | null, tag = t?.tagName;
  if (tag === 'TEXTAREA' || (tag === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes((t as HTMLInputElement).type)) || t?.isContentEditable) return null;
  const k = e.key.toLowerCase();
  if (k === 'z') return e.shiftKey ? 'redo' : 'undo';
  if (k === 'y') return 'redo';
  return null;
}

/** Undo/redo through the history controller, announced in the live region. */
export function runHistory(kind: 'undo' | 'redo'): void {
  const label = (kind === 'undo' ? undo : redo)();
  toast(label ? `${kind === 'undo' ? 'Undone' : 'Redone'}: ${label}` : kind === 'undo' ? 'Nothing to undo' : 'Nothing to redo');
}

export function useShortcuts(): void {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const k = shouldHandle(e); if (k) { e.preventDefault(); runHistory(k); } };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
}
