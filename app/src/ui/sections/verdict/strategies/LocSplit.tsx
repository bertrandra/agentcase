import { LOCATIONS } from '@/domain';
import type { LocSplitRow } from '@/domain/verdict';

const MODE = { asis: ['AS-IS', '#8A94A6'], custom: ['Custom', '#0058AB'], inherit: ['Inherit current', '#BE4D00'] } as const;
const CLS = ['Local', 'Nearshore', 'Offshore'] as const;
const CLR = { Local: '#00828E', Nearshore: '#1DB8F2', Offshore: '#BE4D00' };

/** TO-BE location split per strategy and its aggregate by class (Local / Nearshore / Offshore). */
export function LocSplit({ rows }: { rows: LocSplitRow[] }) {
  return (
    <>
      <h3>TO-BE location split per strategy</h3>
      <div className="ac-table-wrap"><table className="ac-table">
        <thead><tr><th>Strategy</th>{LOCATIONS.map((l) => <th key={l.name} style={{ textAlign: 'center' }}>{l.name}<br /><small>{l.cls}</small></th>)}<th style={{ textAlign: 'center' }}>Σ</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><td>{r.icon} <strong>{r.label}</strong> <span className="ac-badge" style={{ background: MODE[r.mode][1], color: '#fff' }}>{MODE[r.mode][0]}</span></td>
            {LOCATIONS.map((l) => { const v = r.perLoc[l.name] as number; return <td key={l.name} style={{ textAlign: 'center' }}>{v > 0 ? `${v.toFixed(0)}%` : <span className="ac-muted">—</span>}</td>; })}
            <td style={{ textAlign: 'center', fontWeight: 600, color: Math.abs(r.tot - 100) < 0.5 || r.tot === 0 ? 'var(--ac-muted)' : 'var(--ac-brick)' }}>{r.tot ? `${r.tot.toFixed(0)}%` : '—'}</td></tr>))}</tbody>
      </table></div>
      <h3>Aggregate by class</h3>
      <div className="ac-table-wrap"><table className="ac-table">
        <thead><tr><th>Strategy</th>{CLS.map((c) => <th key={c} style={{ textAlign: 'center' }}>{c}</th>)}<th>Visual</th></tr></thead>
        <tbody>{rows.map((r) => {
          const sum = CLS.reduce((a, c) => a + (r.byCls[c] as number), 0) || 1;
          return (
            <tr key={r.id}><td>{r.icon} <strong>{r.label}</strong></td>
              {CLS.map((c) => <td key={c} style={{ textAlign: 'center', color: CLR[c], fontWeight: 600 }}>{(r.byCls[c] as number).toFixed(0)}%</td>)}
              <td><div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', minWidth: 150 }}>
                {CLS.map((c) => <div key={c} title={`${c} ${(r.byCls[c] as number).toFixed(0)}%`} style={{ background: CLR[c], width: `${((r.byCls[c] as number) / sum) * 100}%` }} />)}</div></td></tr>
          );
        })}</tbody>
      </table></div>
      <p className="ac-muted">Custom = the strategy carries its own explicit geo split; AS-IS = the current input-team mix; Inherit current = the strategy uses the live Location strategy of the simulation
        (previewed here against AS-IS for a deterministic view). Editable in the Strategy configuration table below.</p>
    </>
  );
}
