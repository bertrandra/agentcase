import { useState } from 'react';
import { clearActivityRaci, setActivityRaci } from '@/controllers/org';
import type { ActivityRaci, OrgModel } from '@/domain/org';
import { toast } from '@/ui/uiState';

const picked = (s: HTMLSelectElement): string[] => [...s.selectedOptions].map((o) => o.value);

/**
 * The RACI of one activity, edited with native controls (keyboard and screen-reader friendly): the role that prices the activity stays
 * Responsible; other Responsible, the Accountable, Consulted and Informed roles are chosen from the role catalogue. Saved as one undoable step.
 */
export function RaciEditor({ m, a, onClose }: { m: OrgModel; a: ActivityRaci; onClose: () => void }) {
  const roles = m.roles.filter((r) => r.kind === 'role'), primary = roles.find((r) => r.id === a.primary);
  const [R, setR] = useState(a.raci.R.filter((x) => x !== a.primary)), [A, setA] = useState(a.raci.A ?? '');
  const [C, setC] = useState(a.raci.C), [I, setI] = useState(a.raci.I);
  const save = () => {
    toast(setActivityRaci(a.id, { R, ...(A ? { A } : {}), C, I }) ? `RACI of ${a.id} saved — Ctrl+Z to undo` : 'Nothing changed (or refused)');
  };
  const reset = () => toast(clearActivityRaci(a.id) ? `RACI of ${a.id} back to its default — Ctrl+Z to undo` : 'Already the default RACI');
  const options = roles.map((r) => <option key={r.id} value={r.id}>{r.name}{r.teamSkill ? ` (${r.teamSkill})` : ''}</option>);
  return (
    <section className="ac-panel" aria-labelledby="ac-raci-edit-h">
      <h2 id="ac-raci-edit-h">RACI of {a.id} {a.name}</h2>
      <p className="ac-muted">Responsible by its role: <strong>{primary?.name ?? '—'}</strong> (the role that prices the activity, changed in the Process
        section){a.agent && <>; performed by the agent <strong>{m.roles.find((r) => r.id === a.agent)?.name ?? a.agent}</strong></>}.
        Hold Ctrl (⌘ on a Mac) or Shift to choose several roles.</p>
      <div className="ac-raci-edit">
        <label>Also Responsible
          <select multiple value={R} onChange={(e) => setR(picked(e.target))}>{options}</select></label>
        <label>Accountable
          <select value={A} onChange={(e) => setA(e.target.value)}><option value="">— none —</option>{options}</select></label>
        <label>Consulted
          <select multiple value={C} onChange={(e) => setC(picked(e.target))}>{options}</select></label>
        <label>Informed
          <select multiple value={I} onChange={(e) => setI(picked(e.target))}>{options}</select></label>
      </div>
      <div className="ac-form-row">
        <button type="button" onClick={save}>Save the RACI</button>
        <button type="button" onClick={reset} disabled={a.source === 'default'}>Back to the default</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </section>
  );
}
