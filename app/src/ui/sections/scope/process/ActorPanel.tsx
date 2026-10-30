import { useId, useState } from 'react';
import { addProcessActor, removeProcessActor, updateProcessActor } from '@/controllers/process';
import { readProcess, roleId, type XDocument } from '@/domain/process';

/**
 * The actor panel (spec § 8, F-B16): the roles and AI agents of the process with their team skill and how many activities name them; rename and
 * team skill edits (`process.updateActor`, coalesced), "Add role" (`process.addActor`), "Remove" only while no activity names the actor.
 */
export function ActorPanel({ doc }: { doc: XDocument }) {
  const v = readProcess(doc), k = useId(), [name, setName] = useState(''), [skill, setSkill] = useState('');
  const uses = new Map<string, number>();
  for (const a of v.activities) for (const r of [a.humanPerformer, a.performer]) if (r) uses.set(r, (uses.get(r) ?? 0) + 1);
  const skills = [...new Set(v.actors.map((r) => r.teamSkill).filter((s): s is string => !!s))].sort((x, y) => x.localeCompare(y));
  const id = roleId(name.trim()), taken = v.actors.some((r) => r.id === id || r.name.toLowerCase() === name.trim().toLowerCase());
  const add = () => { addProcessActor({ id, name: name.trim(), kind: 'role', teamSkill: skill || undefined }); setName(''); };
  return (
    <section className="ac-proc-actors" aria-labelledby={`${k}-h`}>
      <h2 id={`${k}-h`}>Actors ({v.actors.length})</h2>
      <div className="ac-table-wrap" tabIndex={0} role="region" aria-label="Actors of the process">
        <table className="ac-table">
          <thead><tr>{['Actor', 'Kind', 'Team skill', 'Activities', 'Action'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>
            {v.actors.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.name}</th>
                <td>{r.kind === 'agent' ? 'AI agent' : r.regulatory ? 'Role (regulatory)' : 'Role'}</td>
                <td>
                  {r.kind === 'agent' ? r.capability ?? '—' : (
                    <input type="text" value={r.teamSkill ?? ''} aria-label={`Team skill of ${r.name}`} list={`${k}-skills`}
                      onChange={(e) => updateProcessActor(r.id, { teamSkill: e.target.value || null })} />
                  )}
                </td>
                <td>{uses.get(r.id) ?? 0}</td>
                <td>
                  <button type="button" disabled={(uses.get(r.id) ?? 0) > 0} onClick={() => removeProcessActor(r.id)}
                    title={(uses.get(r.id) ?? 0) > 0 ? 'Named by activities: cannot be removed' : undefined}>Remove {r.name}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id={`${k}-skills`}>{skills.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="ac-form-row">
        <label htmlFor={`${k}-n`}>New role</label>
        <input id={`${k}-n`} type="text" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor={`${k}-s`}>Team skill</label>
        <select id={`${k}-s`} value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">None</option>
          {skills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" disabled={!name.trim() || id === 'role-' || taken} onClick={add}>Add role</button>
      </div>
    </section>
  );
}
