import { Fragment } from 'react';
import { textColor } from '@/ui/colorText';
import { cssVars } from '@/ui/cssVars';
import { CATS, STATUS, type Entry } from './model';
import { useTheme } from '@/ui/themeContext';

/** The glossary rows, with one header row per dimension. */
export function GlossaryTable({ rows }: { rows: Entry[] }) {
  const { tok } = useTheme();
  const statusInk = (s: string) => textColor(STATUS[s]?.color ?? tok('neutral-900'), tok, tok('neutral-25'));
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
                <tr>
                  <th colSpan={4} scope="colgroup" className="ac-gloss-dim" style={cssVars({ '--ac-gloss-dim': c.color })}>{/* dynamic: the dimension's colour */}
                    {i + 1} · {c.label}
                  </th>
                </tr>
                {sub.map((r) => (
                  <tr key={r[1]}>
                    {/* dynamic: the term and status colours are the referential's, made readable against the theme */}
                    <td className="ac-gloss-term" style={cssVars({ '--ac-gloss-ink': textColor(c.color, tok, tok('neutral-25')) })}>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td>
                      <span className="ac-gloss-status" style={cssVars({ '--ac-gloss-ink': statusInk(r[4]) })}>{STATUS[r[4]]?.label ?? r[4]}</span>
                    </td>
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
