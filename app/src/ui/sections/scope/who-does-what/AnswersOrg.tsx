import { useState } from 'react';
import { byProduct, byUnit, type Bucket, type OrgModel } from '@/domain/org';
import { fmtNum } from '@/ui/widgets/orgFormat';
import { Pick, Row } from './Answers';

/** "Who does what" one screen each (F-B38): by organisation unit, by product (organisation chart and RACI matrix per role). */
const buckets = (bs: Bucket[]): string => bs.map((b) => `${b.key || '—'} ${fmtNum(b.fte)}`).join(', ') || '—';

export function ByUnit({ m }: { m: OrgModel }) {
  const [id, setId] = useState(m.units[0]?.id ?? ''), x = byUnit(m, id);
  return (
    <div className="ac-org-answer">
      <Pick label="Unit" value={id} onChange={setId} options={m.units} />
      {x && <dl>
        <Row t="Units below">{x.units.filter((u) => u.id !== id).map((u) => u.name).join(', ') || '—'}</Row>
        <Row t="Teams">{x.teams.map((t) => t.name).join(', ') || '—'}</Row>
        <Row t="Products served">{x.products.map((p) => p.name).join(', ') || '—'}</Row>
        <Row t="Activities">{x.activities} performed</Row>
        <Row t="FTE">{fmtNum(x.fte)}</Row>
        <Row t="By location">{buckets(x.byLocation)}</Row>
        <Row t="By grade">{buckets(x.byGrade)}</Row>
      </dl>}
    </div>
  );
}

export function ByProduct({ m }: { m: OrgModel }) {
  const [id, setId] = useState(m.products[0]?.id ?? ''), x = byProduct(m, id);
  return (
    <div className="ac-org-answer">
      <Pick label="Product" value={id} onChange={setId} options={m.products} />
      {x && <>
        <h2>Organisation chart</h2>
        <ul className="ac-org-chart">{x.chart.map((c) => (
          <li key={c.unit.id}>{c.unit.name}
            <ul>{c.teams.map((t) => <li key={t.team.id}>{t.team.name} ({fmtNum(t.pct)} %): {t.roles.map((r) => r.name).join(', ') || 'no role'}</li>)}</ul>
          </li>
        ))}</ul>
        <div className="ac-table-wrap" tabIndex={0}>
          <table className="ac-table">
            <caption>RACI per role (number of in-scope activities)</caption>
            <thead><tr><th scope="col">Role</th><th scope="col">R</th><th scope="col">A</th><th scope="col">C</th><th scope="col">I</th></tr></thead>
            <tbody>{x.matrix.map((r) => (
              <tr key={r.role.id}><th scope="row">{r.role.name}</th><td className="ac-num">{r.R}</td><td className="ac-num">{r.A}</td>
                <td className="ac-num">{r.C}</td><td className="ac-num">{r.I}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
