import { memo, useId, useMemo, useState } from 'react';
import { setProcessScope, updateProcessActivities } from '@/controllers/process';
import { readProcess, type XDocument } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { counted, type Row } from '../process/tableModel';
import { selectActivity } from '../process/view';
import { AUTHORITIES, phaseStats } from './model';
import { focusPhase, setStudio, toggleOpen, toggleTick, useStudio, type TableView } from './view';

const VIEWS: { id: TableView; label: string; keep: (r: Row) => boolean }[] = [
  { id: 'scope', label: 'In scope', keep: counted }, { id: 'all', label: 'All', keep: () => true },
  { id: 'agent', label: 'Agent tasks', keep: (r) => r.type === 'Agent' }, { id: 'human', label: 'Human and manual', keep: (r) => r.type !== 'Agent' },
  { id: 'regulatory', label: 'Regulatory', keep: (r) => r.regulatory },
];

/**
 * 🗺️ Process studio › Activities: the activities grouped by phase (a phase that is off starts folded), saved views, a search, and the rows ticked
 * changed together — in or out of scope, or one AI authority — as ONE undoable step. A row's id opens it in Phase focus.
 */
export const ActivitiesTab = memo(function ActivitiesTab({ doc, rows }: { doc: XDocument; rows: Row[] }) {
  const id = useId(), st = useStudio((s) => s), [q, setQ] = useState(''), [auth, setAuth] = useState('');
  const v = readProcess(doc), stats = useMemo(() => phaseStats(v.phases, rows), [v.phases, rows]);
  const view = VIEWS.find((x) => x.id === st.view) ?? VIEWS[0]!, t = q.trim().toLowerCase();
  const kept = rows.filter((r) => view.keep(r) && (!t || `${r.id} ${r.name} ${r.role} ${r.agent}`.toLowerCase().includes(t)));
  const ticked = st.ticked.filter((x) => rows.some((r) => r.id === x));
  const bulkScope = (on: boolean) => { setProcessScope(ticked, on);
    toast(`${ticked.length} activit${ticked.length === 1 ? 'y' : 'ies'} ${on ? 'in' : 'out of'} scope (Ctrl+Z undoes)`); };
  const bulkAuth = () => { if (!auth) return; updateProcessActivities(ticked, { aiAuthority: auth });
    toast(`AI authority ${auth} on ${ticked.length} activities (Ctrl+Z undoes)`); };
  return (
    <div className="ac-studio-stack">
      <div className="ac-studio-head">
        <div role="group" aria-label="Saved views" className="ac-studio-chips">
          {VIEWS.map((x) => <button key={x.id} type="button" aria-pressed={st.view === x.id} onClick={() => setStudio({ view: x.id })}>
            {x.label} <strong>{rows.filter(x.keep).length}</strong></button>)}
        </div>
        <label className="ac-studio-field">Search<input type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Id, name, role or agent" /></label>
      </div>
      {ticked.length > 0 && (
        <section className="ac-studio-bulk" aria-label="Change the ticked activities">
          <strong>{ticked.length} ticked</strong>
          <button type="button" onClick={() => bulkScope(true)}>Put in scope</button>
          <button type="button" onClick={() => bulkScope(false)}>Take out of scope</button>
          <label>AI authority <select value={auth} onChange={(e) => setAuth(e.target.value)}><option value="">—</option>
            {AUTHORITIES.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
          <button type="button" disabled={!auth} onClick={bulkAuth}>Apply</button>
          <button type="button" className="ac-studio-clear" onClick={() => setStudio({ ticked: [] })}>Clear</button>
        </section>
      )}
      <section className="ac-studio-card ac-studio-flush" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`} className="ac-sr">Activities by phase</h2>
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-studio-table">
            <thead><tr><th scope="col"><span className="ac-sr">Tick</span></th><th scope="col">In scope</th><th scope="col">Activity</th><th
              scope="col">Type</th>
              <th scope="col">Role</th><th scope="col">Agent</th><th scope="col">AI authority</th><th scope="col">Effort</th><th
                scope="col">Human / agent</th></tr></thead>
            {stats.map((p) => {
              const mine = kept.filter((r) => r.phase === p.id), open = st.open[p.id] ?? (p.on && mine.length > 0);
              if (!mine.length && view.id !== 'all') return null;
              return (
                <tbody key={p.id}>
                  <tr className="ac-studio-group"><th scope="rowgroup" colSpan={9}>
                    <button type="button" aria-expanded={open} onClick={() => toggleOpen(p.id, open)}>
                      <span aria-hidden="true">{open ? '▾' : '▸'}</span> <strong>{p.id} · {p.name}</strong>{' '}
                      <span className="ac-muted">{p.total} activities · {p.on ? `${p.inScope} in scope` : 'phase off'} · {mine.length} shown</span>
                    </button>
                  </th></tr>
                  {open && mine.map((r) => (
                    <tr key={r.id} data-off={!counted(r) || undefined} data-ticked={ticked.includes(r.id) || undefined}>
                      <td><input type="checkbox" aria-label={`Tick ${r.id}`} checked={ticked.includes(r.id)} onChange={() => toggleTick(r.id)} /></td>
                      <td><input type="checkbox" aria-label={`${r.id} in scope`} checked={r.inScope}
                        onChange={(e) => setProcessScope([r.id], e.target.checked)} /></td>
                      <th scope="row"><button type="button" className="ac-link"
                        onClick={() => { selectActivity(r.id); focusPhase(r.phase); }}>{r.id}</button> {r.name}</th>
                      <td><span className="ac-studio-type" data-type={r.type === 'Agent' ? 'agent' : 'human'}>{r.type}</span></td>
                      <td>{r.role || '—'}</td><td>{r.agent || '—'}</td><td>{r.aiAuthority || '—'}</td>
                      <td className="ac-studio-num">{r.effort}</td>
                      <td><span className="ac-studio-split-mini"><meter min={0} max={100} value={r.agentSup}
                        aria-label={`${r.id}: agent ${r.agentSup} %, human ${r.human} %`} />
                        <span>{r.human} / {r.agentSup}</span></span></td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </section>
    </div>
  );
});
