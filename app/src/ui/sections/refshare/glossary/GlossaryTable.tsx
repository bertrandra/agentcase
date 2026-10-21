import { Fragment } from 'react';
import { CATS, STATUS, type Entry } from './model';

/** The glossary rows, with one header row per dimension. */
export function GlossaryTable({ rows }: { rows: Entry[] }) {
  if (!rows.length) return <p className="ac-muted">No term matches.</p>;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        <thead><tr><th>Delivery-model term</th><th>AgentCase equivalent</th><th>Definition</th><th>Status</th></tr></thead>
        <tbody>
          {CATS.map((c, i) => {
            const sub = rows.filter((r) => r[0] === c.id);
            if (!sub.length) return null;
            return (
              <Fragment key={c.id}>
                <tr><th colSpan={4} scope="colgroup" style={{ background: c.color, color: '#fff' }}>{i + 1} · {c.label}</th></tr>
                {sub.map((r) => (
                  <tr key={r[1]}>
                    <td style={{ fontWeight: 600, color: c.color }}>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td>
                    <td><span style={{ color: STATUS[r[4]]?.color }}>{STATUS[r[4]]?.label ?? r[4]}</span></td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
