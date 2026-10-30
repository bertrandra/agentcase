import { useState, type ReactNode } from 'react';
import { byActivity, byRole, byTeam, LETTERS, type OrgModel, type OrgRole, type PerProduct, type Provider } from '@/domain/org';
import { fmtNum } from '@/ui/widgets/orgFormat';

/** "Who does what" one screen each (F-B38): by activity, by role, by team. */
export function Pick({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[];
  onChange: (v: string) => void }) {
  return (
    <label className="ac-form-row">{label}{' '}
      <select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
    </label>
  );
}
/** One term of an answer (a `div` group of the definition list). */
export const Row = ({ t, children }: { t: ReactNode; children: ReactNode }) => <div><dt>{t}</dt><dd>{children}</dd></div>;
const names = (rs: OrgRole[]): string => rs.map((r) => r.name).join(', ') || '—';
const teams = (ps: Provider[]): string => ps.map((p) => `${p.team.name}${p.unit ? ` (${p.unit.name})` : ''} ${fmtNum(p.fte)} FTE`).join('; ')
  || 'no team provides it';
/** The teams that do it, one term per product. */
const ProductRows = ({ list }: { list: PerProduct[] }) => <>{list.map((p) => <Row key={p.product.id} t={p.product.name}>{teams(p.teams)}</Row>)}</>;

export function ByActivity({ m }: { m: OrgModel }) {
  const acts = m.activities.filter((a) => a.inScope), [id, setId] = useState(acts[0]?.id ?? ''), x = byActivity(m, id);
  return (
    <div className="ac-org-answer">
      <Pick label="Activity" value={id} onChange={setId} options={acts.map((a) => ({ id: a.id, name: `${a.id} ${a.name}` }))} />
      {x && <dl>
        {LETTERS.map((l) => <Row key={l} t={l}>{names(x.roles[l])}</Row>)}
        <Row t="Agent">{x.agent?.name ?? '—'}</Row>
        <ProductRows list={x.perProduct} />
      </dl>}
    </div>
  );
}

export function ByRole({ m }: { m: OrgModel }) {
  const roles = m.roles.filter((r) => r.kind === 'role'), [id, setId] = useState(roles[0]?.id ?? ''), x = byRole(m, id);
  return (
    <div className="ac-org-answer">
      <Pick label="Role" value={id} onChange={setId} options={roles} />
      {x && <dl>
        {LETTERS.map((l) => <Row key={l} t={`${l} for`}>{x.activities[l].map((a) => a.id).join(', ') || '—'}</Row>)}
        <Row t="Load">{fmtNum(x.load)} effort points (its R activities, split between their Responsible roles)</Row>
        <Row t="Team skill">{x.role.teamSkill ?? '—'}</Row>
        <ProductRows list={x.perProduct} />
      </dl>}
    </div>
  );
}

export function ByTeam({ m }: { m: OrgModel }) {
  const [id, setId] = useState(m.teams[0]?.id ?? ''), x = byTeam(m, id);
  return (
    <div className="ac-org-answer">
      <Pick label="Team" value={id} onChange={setId} options={m.teams} />
      {x && <dl>
        <Row t="Unit">{x.unit?.name ?? '—'}</Row>
        <Row t="Serves">{x.serves.map((s) => `${s.product.name} ${fmtNum(s.pct)} %`).join(', ') || '—'}</Row>
        <Row t="Roles provided">{names(x.roles)}</Row>
        <Row t="Activities">{x.activities.length} in scope</Row>
        <Row t="Load">{fmtNum(x.load)} effort points for {fmtNum(x.fte)} FTE</Row>
      </dl>}
    </div>
  );
}
