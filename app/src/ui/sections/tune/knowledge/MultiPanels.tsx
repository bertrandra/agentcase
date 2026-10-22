import { useMemo, useState } from 'react';
import { setProductKnowledge } from '@/controllers/productOverrides';
import { hubView } from '@/domain/tuneB/hub';
import { useCtx } from '@/store/hooks';
import { useKnowledgeView } from '@/store/knowledgeHooks';
import { useActiveProduct, useIsMulti } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { NumField } from '@/ui/widgets/CommitField';
import { HubSettings } from '@/ui/widgets/HubSettings';
import { DomainsEditor } from './DomainsEditor';
import { SubsetBadge } from './SubsetBadge';

/** "Produit : X (n champs propres)": which product the section edits, and how much of its subset is its own. */
export function SubsetBanner() {
  const multi = useIsMulti(), p = useActiveProduct();
  if (!multi) return null;
  const n = Object.values(p.knowledge).filter((v) => v !== undefined).length;
  return (
    <p className="ac-prod-banner" role="note" data-overrides={n}>
      Sous-ensemble du Knowledge Hub de : <strong>{p.name}</strong> ({n ? `${n} champ${n > 1 ? 's' : ''} propre${n > 1 ? 's' : ''} au produit` : 'tout est hérité du hub commun'})
      <span className="ac-muted"> — « Ce produit seulement » (barre haute) crée la valeur propre du produit ; « Tous les produits » modifie le hub commun, que les produits héritant suivent.</span>
    </p>
  );
}

/** The engagement context caps the target CC: shown next to the product's target (spec F25d). */
function CapNote() {
  const c = useCtx(), h = useMemo(() => hubView(c), [c]);
  if (h.locked) return <Callout kind="error">Contexte d’engagement {h.context} : le hub est verrouillé pour ce produit.</Callout>;
  return <p className="ac-muted" data-cap={h.maxCC}>Plafond du contexte {h.context} : CC{h.maxCC}. Cible demandée : CC{h.rawTarget}{h.clamped ? ` — plafonnée à CC${h.target}` : ''}.</p>;
}

/** "Préparation du transfert": ktLeadMonths of the active product, >= 0 (spec F28). Shifts only the KT setup cost in the consolidation. */
function LeadField() {
  const p = useActiveProduct(), { diagnostics } = useKnowledgeView(), [error, setError] = useState('');
  const clamp = diagnostics.find((d) => d.code === 'kt-lead-clamped' && d.productId === p.id);
  const commit = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isInteger(n) || n < 0) { setError('La préparation est un nombre entier de mois supérieur ou égal à 0.'); return; }
    setError('');
    if (setProductKnowledge(p.id, { ktLeadMonths: n })) toast(`Préparation du transfert de ${p.name} : ${n} mois`);
  };
  return (
    <Panel title="Préparation du transfert (mois avant la vague)" aside={<SubsetBadge field="ktLeadMonths" label="Préparation du transfert" />}>
      <div className="ac-form-row">
        <NumField label="Préparation du transfert (mois avant la vague)" value={p.knowledge.ktLeadMonths ?? 0} min={0} step={1} onCommit={commit}
          hint="0 = le coût de mise en place du KT tombe au démarrage du produit" />
      </div>
      <p className="ac-muted">Avec k mois, seul le coût de mise en place du transfert (ingestion, curation initiale) est placé k mois avant le démarrage du produit : on prépare la vague suivante pendant la vague en cours. Les bénéfices restent à partir du mois 0.</p>
      {error && <p role="alert" style={{ color: '#8F3237' }}>{error}</p>}
      {clamp && <Callout kind="warn">{clamp.message}</Callout>}
    </Panel>
  );
}

/** What the Knowledge Hub section adds with 2+ products: the target cap, the domains, the preparation and the shared hub settings. */
export function MultiPanels() {
  const multi = useIsMulti();
  if (!multi) return null;
  return (
    <>
      <CapNote />
      <DomainsEditor />
      <LeadField />
      <HubSettings />
    </>
  );
}
