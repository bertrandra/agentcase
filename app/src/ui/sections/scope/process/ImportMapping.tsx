import { useId } from 'react';
import { readProcess, type ImportAnalysis, type ImportChoices } from '@/domain/process';
import { useDoc } from '@/store/hooks';
import { choose } from './view';

/**
 * The mapping step of a foreign import (F-B8, D-B10): each unit of the file that holds new activities (a sub-process, a lane or a process) goes to
 * a phase of the case, suggested when its id or name is a phase's; each new role gets a team skill (suggested when a team skill has its name).
 * The choices are remembered for the session.
 */
export function Mapping({ analysis: a, choices: c }: { analysis: ImportAnalysis; choices: ImportChoices }) {
  const doc = useDoc((d) => d.BPMN), v = readProcess(doc), id = useId();
  const skills = [...new Set(v.actors.map((r) => r.teamSkill).filter((s): s is string => !!s))].sort((x, y) => x.localeCompare(y));
  const fresh = a.tasks.filter((t) => !t.match), units = a.units.filter((u) => fresh.some((t) => t.unit === u.key));
  const roles = a.roles.filter((r) => !r.known && fresh.some((t) => t.roles[0] === r.name));
  if (!units.length && !roles.length) return null;
  return (
    <div className="ac-proc-mapping">
      {units.length > 0 && (
        <table className="ac-table">
          <caption>Where the file&apos;s new activities go</caption>
          <thead><tr><th scope="col">In the file</th><th scope="col">New activities</th><th scope="col">Phase of the case</th></tr></thead>
          <tbody>
            {units.map((u, i) => (
              <tr key={u.key}>
                <th scope="row">{`${u.name} (${u.kind === 'subProcess' ? 'sub-process' : u.kind})`}</th>
                <td>{fresh.filter((t) => t.unit === u.key).length}</td>
                <td>
                  <select id={`${id}-u${i}`} aria-label={`Phase for ${u.name}`} value={c.phaseOf[u.key] ?? u.phase ?? ''}
                    onChange={(e) => choose({ phaseOf: { ...c.phaseOf, [u.key]: e.target.value } })}>
                    <option value="">Choose a phase…</option>
                    {v.phases.map((p) => <option key={p.id} value={p.id}>{`${p.id} · ${p.name}`}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {roles.length > 0 && (
        <table className="ac-table">
          <caption>New roles: the team skill that provides each one</caption>
          <thead><tr><th scope="col">Role in the file</th><th scope="col">Team skill</th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.name}>
                <th scope="row">{r.name}</th>
                <td>
                  <select aria-label={`Team skill for ${r.name}`} value={c.teamSkillOf[r.name] ?? r.teamSkill ?? ''}
                    onChange={(e) => choose({ teamSkillOf: { ...c.teamSkillOf, [r.name]: e.target.value } })}>
                    <option value="">Choose a team skill…</option>
                    {skills.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
