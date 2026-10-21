import { jumpToStep } from '@/controllers/history';
import { useHistory } from '@/store/hooks';
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

export function DockZone() {
  const open = useUi((s) => s.dockOpen), h = useHistory();
  return (
    <footer className="ac-dock" style={{ gridArea: 'dock' }}>
      <button type="button" aria-expanded={open} onClick={toggleDock}>{open ? '▾' : '▸'} History ({h.undo.length})</button>
      {open && <HistoryPanel />}
    </footer>
  );
}
