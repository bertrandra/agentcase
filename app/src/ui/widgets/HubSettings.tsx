import { useId, useState } from 'react';
import { setPortfolioHub } from '@/controllers/portfolio';
import type { HubSettings as Hub } from '@/domain/portfolio';
import { useHub, useKnowledgeView } from '@/store/knowledgeHooks';

import { toast } from '../uiState';
import { Callout } from './cards';
import { NumField } from './CommitField';

/** Euro with cents: the shares are apportioned to the cent. */
const eur2 = (v: number): string => '€' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MODES: { value: Hub['infraAllocation']; label: string; text: string }[] = [
  { value: 'perProduct', label: 'Full cost per product', text: 'Each product that uses the hub bears the whole infrastructure, as in a single case: prudent and additive, but the sum exceeds the real hub cost from two users on.' },
  { value: 'byBaseEtp', label: 'In proportion to the entry headcount', text: 'The infrastructure is split between the planned products that use the hub, in proportion to their entry headcount; the shares add up exactly to the hub cost (to the cent).' },
];

/** Live conservation check: what each hub user carries and whether the shares add up to the hub cost (never counted twice). */
function Conservation() {
  const { infra } = useKnowledgeView();
  const by = infra.mode === 'byBaseEtp';
  return (
    <div>
      <table className="ac-table">
        <caption>Hub infrastructure charged per user product</caption>
        <thead><tr><th scope="col">Product</th><th scope="col">Monthly share</th><th scope="col">Annual share</th></tr></thead>
        <tbody>
          {infra.shares.map((s) => <tr key={s.productId}><th scope="row">{s.name}</th><td>{eur2(s.monthly)}</td><td>{eur2(s.annual)}</td></tr>)}
          {!infra.shares.length && <tr><td colSpan={3}>No planned product uses the hub.</td></tr>}
        </tbody>
        <tfoot><tr><th scope="row">Total shares</th><td>{eur2(infra.sum)}</td><td>{eur2(infra.sum * 12)}</td></tr></tfoot>
      </table>
      <p role="status" data-conserved={infra.conserved} className={infra.conserved ? 'ac-muted' : undefined}>
        {infra.conserved
          ? `Conservation checked: ${by ? `the shares add up to the hub cost (${eur2(infra.monthly)}/month)` : `${infra.shares.length} user(s) × ${eur2(infra.monthly)}/month = ${eur2(infra.expected)}/month`}.`
          : `Conservation gap: the shares add up to ${eur2(infra.sum)}/month, expected ${eur2(infra.expected)}/month.`}
      </p>
    </div>
  );
}

/** The Knowledge Hub shared by the portfolio: default activation, monthly infrastructure and how it is charged to the products (spec F24, F30). */
export function HubSettings() {
  const hub = useHub(), [error, setError] = useState(''), tid = useId();
  const commitInfra = (raw: string) => {
    const n = parseFloat(raw);
    if (!(n >= 0) || !Number.isFinite(n)) { setError('The infrastructure must be a number greater than or equal to 0.'); return; }
    setError('');
    setPortfolioHub({ infraMonthly: n });
  };
  return (
    <section className="ac-panel" aria-labelledby={tid}>
      <header><h2 id={tid}>Portfolio Knowledge Hub (common to all products)</h2></header>
      <label className="ac-check">
        <input type="checkbox" checked={hub.enabled} onChange={(e) => { if (setPortfolioHub({ enabled: e.target.checked })) toast(e.target.checked ? 'Hub enabled by default' : 'Hub disabled by default'); }} /> Hub enabled by default (inherited by the products)
      </label>
      <div className="ac-form-row">
        <NumField label="Hub infrastructure (€/month)" value={hub.infraMonthly} min={0} step={250} onCommit={commitInfra} />
      </div>
      {error && <p role="alert" style={{ color: 'var(--ac-danger-800)' }}>{error}</p>}
      <fieldset style={{ border: 0, padding: 0 }}>
        <legend><strong>Infrastructure allocation</strong></legend>
        {MODES.map((m) => (
          <label key={m.value} className="ac-check" style={{ display: 'block' }}>
            <input type="radio" name="hub-infra-allocation" value={m.value} checked={hub.infraAllocation === m.value} onChange={() => { setPortfolioHub({ infraAllocation: m.value }); }} /> <strong>{m.label}</strong>
            <span className="ac-field-h"> — {m.text}</span>
          </label>
        ))}
      </fieldset>
      <Conservation />
      <Callout>Curation and setup stay specific to each product (its subset); only the infrastructure is common.</Callout>
    </section>
  );
}
