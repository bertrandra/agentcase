import type { Provenance as Prov } from '@/domain/pdc/verifProvenance';
import { Callout } from '@/ui/widgets/cards';
import { useTheme } from '@/ui/themeContext';
import { cssVars } from '@/ui/cssVars';

/** An overlay's state chip, tinted with its colour (`${col}18`: a resolved hex of the theme, so set as a value). */
const chip = (col: string, text: string) => (
  <span className="ac-prov-chip" style={cssVars({ '--ac-prov-col': col, '--ac-prov-tint': `${col}18` })}>{text}</span>   // dynamic: a theme colour and its tint
);

/** One top-bar figure: its label above its value. */
const HeadTile = ({ label, value }: { label: string; value: string }) => (
  <div className="ac-card ac-prov-tile">
    <div className="ac-prov-tile-l">{label}</div>
    <div className="ac-prov-tile-v">{value}</div>
  </div>
);

/** What the headline reflects: top-bar figures, optional overlays and their state, and the double-count guards. */
export function Provenance({ p }: { p: Prov }) {
  const { tok } = useTheme();   // the chip tints its colour (`${col}18`): a resolved hex
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
          <tr key={o.name}>
            <td className="ac-prov-name">{o.name}<span className="ac-muted ac-prov-scope">{o.euro ? ' · affects €' : ' · verdict only'}</span></td>
            <td className="ac-c">{chip(o.active ? tok('warning-600') : tok('slate-680'), o.active ? 'ACTIVE' : 'neutral')}</td>
            <td className="ac-prov-text">{o.effect}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <h3>Double-count guards</h3>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Guard</th><th>What it protects</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>{p.guards.map((g) => (
          <tr key={g.name}>
            <td className="ac-prov-name">{g.name}</td>
            <td className="ac-prov-text">{g.what}</td>
            <td className="ac-c ac-verdict-cell" data-tone={g.ok ? 'teal' : 'amber'}>{g.ok ? 'OK' : 'REVIEW'}</td>
            <td className="ac-small">{g.detail}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}
