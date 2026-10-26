import { LOCATIONS } from '@/domain';
import { isSplitComplete } from '@/domain/split';
import type { LocSplitRow } from '@/domain/verdict';
import { cssVars } from '@/ui/cssVars';

/** The label of each split mode; its badge colour is the `data-mode` rule of sections-b.css. */
const MODE = { asis: 'AS-IS', custom: 'Custom', inherit: 'Inherit current' } as const;
/** The location classes; each one's colour is the `data-cls` rule of sections-b.css. */
const CLS = ['Local', 'Nearshore', 'Offshore'] as const;

const share = (v: number) => (v > 0 ? `${v.toFixed(0)}%` : <span className="ac-muted">—</span>);

/** TO-BE location split per strategy and its aggregate by class (Local / Nearshore / Offshore). */
export function LocSplit({ rows }: { rows: LocSplitRow[] }) {
  return (
    <>
      <h3>TO-BE location split per strategy</h3>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead>
          <tr><th>Strategy</th>{LOCATIONS.map((l) => <th key={l.name} className="ac-center">{l.name}<br /><small>{l.cls}</small></th>)}
            <th className="ac-center">Σ</th></tr>
        </thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td>{r.icon} <strong>{r.label}</strong> <span className="ac-badge ac-split-mode" data-mode={r.mode}>{MODE[r.mode]}</span></td>
            {LOCATIONS.map((l) => <td key={l.name} className="ac-c">{share(r.perLoc[l.name] as number)}</td>)}
            <td className={isSplitComplete(r.tot) || r.tot === 0 ? 'ac-c ac-split-tot' : 'ac-c ac-split-tot is-off'}>{r.tot ? `${r.tot.toFixed(0)}%` : '—'}</td>
          </tr>))}</tbody>
      </table></div>
      <h3>Aggregate by class</h3>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Strategy</th>{CLS.map((c) => <th key={c} className="ac-center">{c}</th>)}<th>Visual</th></tr></thead>
        <tbody>{rows.map((r) => {
          const sum = CLS.reduce((a, c) => a + (r.byCls[c] as number), 0) || 1;
          return (
            <tr key={r.id}><td>{r.icon} <strong>{r.label}</strong></td>
              {CLS.map((c) => <td key={c} className="ac-c ac-split-cls" data-cls={c}>{(r.byCls[c] as number).toFixed(0)}%</td>)}
              <td>
                <div className="ac-split-bar">
                  {CLS.map((c) => (
                    <div
                      key={c}
                      data-cls={c}
                      title={`${c} ${(r.byCls[c] as number).toFixed(0)}%`}
                      style={cssVars({ '--dyn-split-pct': `${((r.byCls[c] as number) / sum) * 100}%` })}   // dynamic: the class's share of the split
                    />
                  ))}
                </div>
              </td>
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="ac-muted">Custom = the strategy carries its own explicit geo split; AS-IS = the current input-team mix; Inherit current = the strategy uses
        the live Location strategy of the simulation
        (previewed here against AS-IS for a deterministic view). Editable in the Strategy configuration table below.</p>
    </>
  );
}
