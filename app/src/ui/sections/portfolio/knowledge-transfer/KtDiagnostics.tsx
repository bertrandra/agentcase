import { useKnowledgeView } from '@/store/knowledgeHooks';
import { Panel } from '@/ui/widgets/cards';

const LABEL: Record<string, string> = {
  'hub-unused': 'Hub inutilisé', unscheduled: 'Produit non planifié', 'target-capped': 'Cible plafonnée', 'kt-lead-clamped': 'Préparation plafonnée au mois 1',
};

/** Diagnostics of the knowledge transfer as an accessible list: hub used by no product, unplanned product, target capped, preparation capped at month 1. */
export function KtDiagnostics() {
  const { diagnostics } = useKnowledgeView();
  return (
    <Panel title="Diagnostics">
      {diagnostics.length === 0 ? <p className="ac-muted">Aucun diagnostic : chaque produit planifié a un hub exploitable, une cible atteignable et une préparation possible.</p> : (
        <ul aria-label="Diagnostics du knowledge transfer">
          {diagnostics.map((d, i) => <li key={`${d.code}-${d.productId ?? ''}-${i}`} data-code={d.code}><strong>{LABEL[d.code] ?? d.code}</strong> — {d.message}</li>)}
        </ul>
      )}
    </Panel>
  );
}
