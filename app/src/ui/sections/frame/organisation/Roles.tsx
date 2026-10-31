import type { OrgParts } from './Units';

/**
 * The role catalogue: the roles and AI agents of the process (its resources). The 26 legacy role names map to the 7 team skills; a role's team skill
 * is edited in the skill map (Verify A) and in the Process section.
 */
export function Roles({ m }: { m: OrgParts }) {
  const roles = m.roles.filter((r) => r.kind === 'role'), agents = m.roles.filter((r) => r.kind === 'agent');
  return (
    <section aria-labelledby="ac-org-roles-h">
      <h2 id="ac-org-roles-h">Role catalogue</h2>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>Roles ({roles.length}) and AI agents ({agents.length})</caption>
          <thead><tr><th scope="col">Role</th><th scope="col">Kind</th><th scope="col">Team skill</th><th scope="col">Capability</th></tr></thead>
          <tbody>{[...roles, ...agents].map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.name}</th>
              <td>{r.kind === 'agent' ? 'AI agent' : r.regulatory ? 'Regulatory role' : 'Role'}</td>
              <td>{r.teamSkill ?? '—'}</td>
              <td>{r.capability ?? '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
