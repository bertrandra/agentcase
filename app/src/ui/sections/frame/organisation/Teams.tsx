import type { OrgTeam } from '@/domain/org';
import { goSection } from '@/ui/uiState';
import { fmtNum } from '@/ui/widgets/orgFormat';
import type { OrgParts } from './Units';

const lineText = (t: OrgTeam): string => t.lines.map((l) => `${l.skill} · ${l.grade} · ${l.loc} · ${fmtNum(+l.etp || 0)} FTE`).join('; ') || '—';
const fteOf = (t: OrgTeam): number => t.lines.reduce((s, l) => s + (+l.etp || 0), 0);

/**
 * The teams of the organisation, stored in its organisation part (schema v5): each product's delivery team is its entry team (edited in Input
 * team), each shared team line a shared team (edited in Products); the figures read them exactly as before.
 */
export function Teams({ m }: { m: OrgParts }) {
  const products = new Map(m.products.map((p) => [p.id, p.name])), units = new Map(m.units.map((u) => [u.id, u.name]));
  return (
    <section aria-labelledby="ac-org-teams-h">
      <h2 id="ac-org-teams-h">Teams</h2>
      <p className="ac-muted">Each product&apos;s entry team is its delivery team; each shared team line is a shared team serving its products with
        their shares.
        Edit them in <button type="button" className="ac-link" onClick={() => goSection('team-in')}>Input team</button>
        {m.products.length > 1 && <> and the shared team lines of{' '}
          <button type="button" className="ac-link" onClick={() => goSection('products')}>Products</button></>}.
      </p>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>Teams ({m.teams.length})</caption>
          <thead><tr>
            <th scope="col">Team</th><th scope="col">Unit</th><th scope="col">Serves</th><th scope="col">FTE</th>
            <th scope="col">Lines (skill · grade · location · FTE)</th>
          </tr></thead>
          <tbody>{m.teams.map((t) => (
            <tr key={t.id}>
              <th scope="row">{t.name}{t.imported && <span className="ac-muted"> (imported, not in the figures)</span>}</th>
              <td>{units.get(t.unit) ?? t.unit}</td>
              <td>{t.serves.map((s) => `${products.get(s.productId) ?? s.productId} ${fmtNum(s.pct)} %`).join(', ') || '—'}</td>
              <td className="ac-num">{fmtNum(fteOf(t))}</td>
              <td>{lineText(t)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
