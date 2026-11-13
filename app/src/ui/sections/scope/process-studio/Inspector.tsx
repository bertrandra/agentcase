import { useId } from 'react';
import { setActivityRaci } from '@/controllers/org';
import { setProcessScope, updateProcessActivity } from '@/controllers/process';
import { moveProcessActivity } from '@/controllers/processLayout';
import { readRaci } from '@/domain/org';
import { readProcess, type XDocument } from '@/domain/process';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';
import { counted, type Row } from '../process/tableModel';
import { selectActivity } from '../process/view';
import { AUTHORITIES } from './model';
import { setStudio } from './view';

/** A rework loop as the inspector says it: from (or to) the other activity, with its probability. */
const loopText = (w: { activityA: string; activityB: string; probability: number }, id: string): string =>
  `${w.activityA === id ? `from ${w.activityB}` : `to ${w.activityA}`}, ${Math.round(w.probability * 100)} %`;
const num = (s: string): number | null => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

/**
 * The inspector of the selected activity (🗺️ Process studio): in scope, name, phase, effort, AI authority, Responsible role and the human / agent
 * supervision split; what it touches (rework loops, decision, RACI). Every change is the 🧩 Process section's own command, one undoable step.
 */
export function Inspector({ doc, row }: { doc: XDocument; row: Row | undefined }) {
  const k = useId();
  if (!row) return <aside className="ac-studio-card ac-studio-inspector" aria-label="Inspector"><p
    className="ac-muted">Select an activity to edit it.</p></aside>;
  const v = readProcess(doc), raci = readRaci(doc).find((a) => a.id === row.id);
  const loops = v.flows.filter((f) => f.rework && (f.rework.activityA === row.id || f.rework.activityB === row.id));
  const roles = v.actors.filter((a) => a.kind !== 'agent'), nameOf = (r: string) => v.actors.find((a) => a.id === r)?.name ?? r;
  const setR = (role: string) => {
    if (!raci) return;
    const next = { R: role ? [role] : [], C: raci.raci.C, I: raci.raci.I, ...(raci.raci.A ? { A: raci.raci.A } : {}) };
    if (!setActivityRaci(row.id, next)) toast('Responsible refused');
  };
  const split = (agent: number) => updateProcessActivity(row.id, { agentSup: agent, humanSup: 100 - agent });
  return (
    <aside className="ac-studio-card ac-studio-inspector" aria-labelledby={`${k}-h`}>
      <span className="ac-studio-eyebrow">Inspector</span>
      <h2 id={`${k}-h`} className="ac-studio-title">{row.id} · {row.name}</h2>
      <label className="ac-studio-scope" data-on={counted(row) || undefined}>
        <input type="checkbox" checked={row.inScope} onChange={(e) => setProcessScope([row.id], e.target.checked)} />
        {row.inScope ? (row.phaseOff ? 'In scope, but its phase is off' : 'In scope — counted in the case') : 'Out of scope'}
      </label>
      <label className="ac-studio-field">Name <DraftText label="Name" value={row.name}
        onCommit={(name) => name.trim() && updateProcessActivity(row.id, { name })} /></label>
      <div className="ac-studio-grid2">
        <label className="ac-studio-field">Phase
          <select value={row.phase} disabled={loops.length > 0} onChange={(e) => { moveProcessActivity(row.id, e.target.value);
            setStudio({ phase: e.target.value }); }}>
            {v.phases.map((p) => <option key={p.id} value={p.id}>{`${p.id} · ${p.name}`}</option>)}
          </select>
        </label>
        <label className="ac-studio-field">Effort (points)
          <input type="number" min={0} step="any" value={row.effort}
            onChange={(e) => { const n = num(e.target.value); if (n !== null && n >= 0) updateProcessActivity(row.id, { effort: n }); }} />
        </label>
      </div>
      <div className="ac-studio-grid2">
        <label className="ac-studio-field">AI authority
          <select value={row.aiAuthority} onChange={(e) => updateProcessActivity(row.id, { aiAuthority: e.target.value })}>
            {[...new Set([row.aiAuthority, ...AUTHORITIES])].filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="ac-studio-field">Responsible
          <select value={raci?.raci.R[0] ?? ''} onChange={(e) => setR(e.target.value)} disabled={!raci}>
            <option value="">—</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
      </div>
      <div className="ac-studio-field">
        <span>Supervision split</span>
        <div className="ac-studio-splitbar" aria-hidden="true">
          <span className="ac-studio-splitbar-h">Human {row.human} %</span><meter min={0} max={100} value={row.agentSup} />
          <span className="ac-studio-splitbar-a">Agent {row.agentSup} %</span>
        </div>
        <input type="range" min={0} max={100} step={5} value={row.agentSup} aria-label="Agent share of the supervision split (%)"
          onChange={(e) => split(Number(e.target.value))} />
      </div>
      <dl className="ac-studio-dl">
        <dt>Type</dt><dd>{row.type}{row.regulatory ? ' (regulatory)' : ''}</dd>
        <dt>Agent</dt><dd>{row.agent || '—'}</dd>
        <dt>Rework loops</dt><dd>{loops.length ? loops.map((f) => loopText(f.rework!, row.id)).join('; ') : 'none'}</dd>
        <dt>RACI</dt><dd>{raci ? `R ${raci.raci.R.map(nameOf).join(', ') || '—'} · A ${raci.raci.A ? nameOf(raci.raci.A) : '—'}` : '—'}</dd>
      </dl>
      {loops.length > 0 && <p className="ac-muted">Part of a rework loop: it stays in its phase.</p>}
      <div className="ac-studio-actions">
        <button type="button" onClick={() => setStudio({ tab: 'roles', rolesView: 'raci' })}>Edit the RACI</button>
        <button type="button" onClick={() => selectActivity(null)}>Close</button>
      </div>
      <p className="ac-muted">Each change is one step, undone by Ctrl+Z.</p>
    </aside>
  );
}
