import type { Provenance as Prov } from '@/domain/pdc/verifProvenance';
import { Callout } from '@/ui/widgets/cards';
import { tok } from '@/domain/theme';

const chip = (col: string, text: string) => <span style={{ background: `${col}18`, color: col, border: `1px solid ${col}`, borderRadius: 'var(--ac-radius-lg-plus)', padding: '1px 9px', fontSize: 'var(--ac-font-size-sm)', fontWeight: 'var(--ac-font-weight-bold)' }}>{text}</span>;

/** One top-bar figure: its label above its value. */
const HeadTile = ({ label, value }: { label: string; value: string }) => (
  <div className="ac-card" style={{ textAlign: 'center', padding: '7px 12px' }}>
    <div style={{ fontSize: 'var(--ac-font-size-2xs)', color: 'var(--ac-neutral-700)', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 'var(--ac-font-size-xl)', fontWeight: 'var(--ac-font-weight-bold)' }}>{value}</div>
  </div>
);

/** What the headline reflects: top-bar figures, optional overlays and their state, and the double-count guards. */
export function Provenance({ p }: { p: Prov }) {
  return (
    <section className="ac-panel" aria-label="Provenance of the headline">
      <h2>🧾 What the headline reflects <small className="ac-muted">provenance &amp; double-count audit</small></h2>
      {p.clean
        ? <Callout><strong>Clean baseline.</strong> All euro-affecting overlays are neutral, so the top bar is the deterministic reference case — nothing optional is inflating or deflating it.</Callout>
        : <Callout kind="warn"><strong>You are NOT on the clean baseline.</strong> One or more euro-affecting overlays are active (highlighted below). Turn them off to return the top bar to the reference case.</Callout>}
      <div className="ac-form-row">
        {p.head.map(([k, v]) => <HeadTile key={k} label={k} value={v} />)}
      </div>
      <p className="ac-muted">The top-bar figures are the deterministic output of the current inputs. Risk / AI-Act / eligibility overlays move only the <em>Decision-Intelligence verdict</em>, never these euros.</p>
      <h3>Optional overlays — current state</h3>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Overlay</th><th>State</th><th>Effect</th></tr></thead>
        <tbody>{p.overlays.map((o) => (
          <tr key={o.name}><td style={{ fontWeight: 'var(--ac-font-weight-semibold)' }}>{o.name}<span className="ac-muted" style={{ fontSize: 'var(--ac-font-size-2xs)' }}>{o.euro ? ' · affects €' : ' · verdict only'}</span></td>
            <td style={{ textAlign: 'center' }}>{chip(o.active ? tok('warning-600') : tok('slate-680'), o.active ? 'ACTIVE' : 'neutral')}</td><td style={{ fontSize: 'var(--ac-font-size-sm-plus)' }}>{o.effect}</td></tr>
        ))}</tbody>
      </table></div>
      <h3>Double-count guards</h3>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Guard</th><th>What it protects</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>{p.guards.map((g) => (
          <tr key={g.name}><td style={{ fontWeight: 'var(--ac-font-weight-semibold)' }}>{g.name}</td><td style={{ fontSize: 'var(--ac-font-size-sm-plus)' }}>{g.what}</td>
            <td style={{ textAlign: 'center', fontWeight: 'var(--ac-font-weight-bold)', color: g.ok ? 'var(--ac-teal-700)' : 'var(--ac-warning-600)' }}>{g.ok ? 'OK' : 'REVIEW'}</td><td style={{ fontSize: 'var(--ac-font-size-sm)' }}>{g.detail}</td></tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}
