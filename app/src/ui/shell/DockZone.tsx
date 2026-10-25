import { jumpToStep } from '@/controllers/history';
import { useHistory } from '@/store/hooks';
import { useCaughtErrors } from '../errors/errorLog';
import { toggleDock, useUi } from '../uiState';

/** History steps (click to jump) — the audit trail of what changed the case. */
function HistoryPanel() {
  const h = useHistory();
  if (!h.undo.length && !h.redo.length) return <p className="ac-muted">No change yet in this session.</p>;
  return (
    <ol className="ac-history" aria-label="History">
      <li><button type="button" onClick={() => jumpToStep(0)}>Initial state</button></li>
      {h.undo.map((e, i) => <li key={`u${i}`}><button type="button" className="is-done" onClick={() => jumpToStep(i + 1)}>{e.label}</button></li>)}
      {[...h.redo].reverse().map((e, i) => <li key={`r${i}`}><button type="button" className="is-undone" onClick={() => jumpToStep(h.undo.length + i + 1)}>{e.label}</button></li>)}
    </ol>
  );
}

/** Display errors caught by the error boundaries in this session (newest first; never saved with the case). Absent while there is none. */
function ErrorsPanel() {
  const errors = useCaughtErrors();
  if (!errors.length) return null;
  return (
    <ol className="ac-dock-errors" aria-label="Display errors in this session">
      {errors.map((e, i) => <li key={`${e.at}${i}`}>{e.scope === 'chart' ? 'Chart' : e.scope === 'app' ? 'App' : 'Section'} “{e.where}”: {e.message}</li>)}
    </ol>
  );
}

export function DockZone() {
  const open = useUi((s) => s.dockOpen), h = useHistory(), errors = useCaughtErrors().length;
  return (
    <footer className="ac-dock">
      <button type="button" aria-expanded={open} onClick={toggleDock}>{open ? '▾' : '▸'} History ({h.undo.length}){errors ? ` · ${errors} display error${errors > 1 ? 's' : ''}` : ''}</button>
      {open && <HistoryPanel />}
      {open && <ErrorsPanel />}
    </footer>
  );
}
