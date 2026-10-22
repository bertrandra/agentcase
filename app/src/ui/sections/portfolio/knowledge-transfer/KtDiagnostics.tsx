import { useKnowledgeView } from '@/store/knowledgeHooks';
import { Panel } from '@/ui/widgets/cards';

const LABEL: Record<string, string> = {
  'hub-unused': 'Hub unused', unscheduled: 'Unscheduled product', 'target-capped': 'Target capped', 'kt-lead-clamped': 'Preparation capped at month 1',
};

/** Diagnostics of the knowledge transfer as an accessible list: hub used by no product, unplanned product, target capped, preparation capped at month 1. */
export function KtDiagnostics() {
  const { diagnostics } = useKnowledgeView();
  return (
    <Panel title="Diagnostics">
      {diagnostics.length === 0 ? <p className="ac-muted">No diagnostic: every scheduled product has a usable hub, a reachable target and a possible preparation.</p> : (
        <ul aria-label="Knowledge transfer diagnostics">
          {diagnostics.map((d, i) => <li key={`${d.code}-${d.productId ?? ''}-${i}`} data-code={d.code}><strong>{LABEL[d.code] ?? d.code}</strong> — {d.message}</li>)}
        </ul>
      )}
    </Panel>
  );
}
