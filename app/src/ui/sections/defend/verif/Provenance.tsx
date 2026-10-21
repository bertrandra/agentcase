import type { Provenance as Prov } from '@/domain/pdc/verifProvenance';
import { Callout } from '@/ui/widgets/cards';

const chip = (col: string, text: string) => <span style={{ background: `${col}18`, color: col, border: `1px solid ${col}`, borderRadius: 9, padding: '1px 9px', fontSize: 11, fontWeight: 700 }}>{text}</span>;

/** What the headline reflects: top-bar figures, optional overlays and their state, and the double-count guards. */
export function Provenance({ p }: { p: Prov }) {
  return (
    <section className="ac-panel" aria-label="Provenance of the headline">
      <h2>🧾 What the headline reflects <small className="ac-muted">provenance &amp; double-count audit</small></h2>
      {p.clean
        ? <Callout><strong>Clean baseline.</strong> All euro-affecting overlays are neutral, so the top bar is the deterministic reference case — nothing optional is inflating or deflating it.</Callout>
        : <Callout kind="warn"><strong>You are NOT on the clean baseline.</strong> One or more euro-affecting overlays are active (highlighted below). Turn them off to return the top bar to the reference case.</Callout>}
      <div className="ac-form-row">
        {p.head.map(([k, v]) => <div key={k} className="ac-card" style={{ textAlign: 'center', padding: '7px 12px' }}><div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase' }}>{k}</div><div style={{ fontSize: 15, fontWeight: 700 }}>{v}</div></div>)}
      </div>
      <p className="ac-muted">The top-bar figures are the deterministic output of the current inputs. Risk / AI-Act / eligibility overlays move only the <em>Decision-Intelligence verdict</em>, never these euros.</p>
      <h3>Optional overlays — current state</h3>
      <div className="ac-table-wrap"><table className="ac-table">
        <thead><tr><th>Overlay</th><th>State</th><th>Effect</th></tr></thead>
        <tbody>{p.overlays.map((o) => (
          <tr key={o.name}><td style={{ fontWeight: 600 }}>{o.name}<span className="ac-muted" style={{ fontSize: 9 }}>{o.euro ? ' · affects €' : ' · verdict only'}</span></td>
            <td style={{ textAlign: 'center' }}>{chip(o.active ? '#BE4D00' : '#8a8f99', o.active ? 'ACTIVE' : 'neutral')}</td><td style={{ fontSize: 11.5 }}>{o.effect}</td></tr>
        ))}</tbody>
      </table></div>
      <h3>Double-count guards</h3>
      <div className="ac-table-wrap"><table className="ac-table">
        <thead><tr><th>Guard</th><th>What it protects</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>{p.guards.map((g) => (
          <tr key={g.name}><td style={{ fontWeight: 600 }}>{g.name}</td><td style={{ fontSize: 11.5 }}>{g.what}</td>
            <td style={{ textAlign: 'center', fontWeight: 700, color: g.ok ? '#00828E' : '#BE4D00' }}>{g.ok ? 'OK' : 'REVIEW'}</td><td style={{ fontSize: 11 }}>{g.detail}</td></tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}
