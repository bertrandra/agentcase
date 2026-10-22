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
  { value: 'perProduct', label: 'Coût complet par produit', text: 'Chaque produit qui utilise le hub supporte la totalité de l’infrastructure, comme dans un cas unique : prudent et additif, mais la somme dépasse le coût réel du hub dès deux utilisateurs.' },
  { value: 'byBaseEtp', label: 'Au prorata de l’effectif d’entrée', text: 'L’infrastructure est répartie entre les produits planifiés qui utilisent le hub, au prorata de leur effectif d’entrée ; la somme des parts vaut exactement le coût du hub (au centime).' },
];

/** Live conservation check: what each hub user carries and whether the shares add up to the hub cost (never counted twice). */
function Conservation() {
  const { infra } = useKnowledgeView();
  const by = infra.mode === 'byBaseEtp';
  return (
    <div>
      <table className="ac-table">
        <caption>Infrastructure du hub imputée par produit utilisateur</caption>
        <thead><tr><th scope="col">Produit</th><th scope="col">Part mensuelle</th><th scope="col">Part annuelle</th></tr></thead>
        <tbody>
          {infra.shares.map((s) => <tr key={s.productId}><th scope="row">{s.name}</th><td>{eur2(s.monthly)}</td><td>{eur2(s.annual)}</td></tr>)}
          {!infra.shares.length && <tr><td colSpan={3}>Aucun produit planifié n’utilise le hub.</td></tr>}
        </tbody>
        <tfoot><tr><th scope="row">Total des parts</th><td>{eur2(infra.sum)}</td><td>{eur2(infra.sum * 12)}</td></tr></tfoot>
      </table>
      <p role="status" data-conserved={infra.conserved} className={infra.conserved ? 'ac-muted' : undefined}>
        {infra.conserved
          ? `Conservation vérifiée : ${by ? `les parts totalisent le coût du hub (${eur2(infra.monthly)}/mois)` : `${infra.shares.length} utilisateur(s) × ${eur2(infra.monthly)}/mois = ${eur2(infra.expected)}/mois`}.`
          : `Écart de conservation : les parts totalisent ${eur2(infra.sum)}/mois, attendu ${eur2(infra.expected)}/mois.`}
      </p>
    </div>
  );
}

/** The Knowledge Hub shared by the portfolio: default activation, monthly infrastructure and how it is charged to the products (spec F24, F30). */
export function HubSettings() {
  const hub = useHub(), [error, setError] = useState(''), tid = useId();
  const commitInfra = (raw: string) => {
    const n = parseFloat(raw);
    if (!(n >= 0) || !Number.isFinite(n)) { setError('L’infrastructure doit être un nombre supérieur ou égal à 0.'); return; }
    setError('');
    setPortfolioHub({ infraMonthly: n });
  };
  return (
    <section className="ac-panel" aria-labelledby={tid}>
      <header><h2 id={tid}>Knowledge Hub du portefeuille (commun à tous les produits)</h2></header>
      <label className="ac-check">
        <input type="checkbox" checked={hub.enabled} onChange={(e) => { if (setPortfolioHub({ enabled: e.target.checked })) toast(e.target.checked ? 'Hub activé par défaut' : 'Hub désactivé par défaut'); }} /> Hub activé par défaut (hérité par les produits)
      </label>
      <div className="ac-form-row">
        <NumField label="Infrastructure du hub (€/mois)" value={hub.infraMonthly} min={0} step={250} onCommit={commitInfra} />
      </div>
      {error && <p role="alert" style={{ color: '#8F3237' }}>{error}</p>}
      <fieldset style={{ border: 0, padding: 0 }}>
        <legend><strong>Imputation de l’infrastructure</strong></legend>
        {MODES.map((m) => (
          <label key={m.value} className="ac-check" style={{ display: 'block' }}>
            <input type="radio" name="hub-infra-allocation" value={m.value} checked={hub.infraAllocation === m.value} onChange={() => { setPortfolioHub({ infraAllocation: m.value }); }} /> <strong>{m.label}</strong>
            <span className="ac-field-h"> — {m.text}</span>
          </label>
        ))}
      </fieldset>
      <Conservation />
      <Callout>La curation et la mise en place restent propres à chaque produit (son sous-ensemble) ; seule l’infrastructure est commune.</Callout>
    </section>
  );
}
