import { engagementKey } from '@/domain/engagement';
import { CM_DEFS, type CmView } from '@/domain/pdc/commercial';
import { useCtx } from '@/store/hooks';
import { fmtK } from '@/ui/economicsFormat';

const tone = (x: number) => ({ color: x >= 0 ? '#006e79' : '#8F3237' });

/** The four selling models side by side: client price and Capgemini margin. The selected model is highlighted. */
export function CmTable({ v, sel }: { v: CmView; sel: string }) {
  const key = engagementKey(useCtx()), H = v.horizon;
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table">
        <thead><tr>
          <th>Model</th><th>Client revenue {H}y</th><th>CG cost {H}y (run + billable setup)</th><th>CG margin {H}y</th><th>Client TCO {H}y</th><th>Client saving vs AS-IS</th>
        </tr></thead>
        <tbody>
          {v.rows.map((r) => {
            const d = CM_DEFS[r.code];
            if (!r.available) {
              return <tr key={r.code} style={{ color: 'var(--ac-muted)' }}><td>{d.label}</td><td colSpan={5} style={{ fontSize: 11, color: '#8F3237', textAlign: 'center' }}>unavailable under {key} — {d.why}</td></tr>;
            }
            const on = r.code === sel;
            return (
              <tr key={r.code} style={on ? { background: '#FFF5E8', fontWeight: 700 } : undefined}>
                <td>{d.label}{on ? ' ◀' : ''}</td><td>{fmtK(r.revenue)}</td><td>{fmtK(r.cost)}</td>
                <td style={tone(r.margin)}>{fmtK(r.margin)} ({Math.round(r.marginPct)}%)</td><td>{fmtK(r.tco)}</td>
                <td style={tone(r.clientSaving)}>{Math.round(r.clientSaving)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
