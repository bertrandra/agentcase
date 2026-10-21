import { Badge, Panel } from '@/ui/widgets/cards';
import { CoefInput } from '@/ui/widgets/CoefInput';

/** Two display-only coefficients (no euro path): agent capacity factor and the flat AI-FinOps FTE. */
export function DisplayCoefs() {
  return (
    <Panel title="Display-only coefficients" aside={<Badge>no € path</Badge>}>
      <p className="ac-muted">Two more literals surfaced by the hardcoded-parameter audit. Both terminate in a display label — moving them does not change savings, run cost or NPV.</p>
      <div className="ac-form-row">
        <CoefInput coef="prodFactor" domId="runProdFactor" label="Agent capacity factor ×" step={0.05} />
        <CoefInput coef="aiFinOpsFte" domId="runAiFinOpsFte" label="AI-FinOps (flat FTE)" step={0.05} />
      </div>
      <p className="ac-muted">Agent capacity factor scales the "(indicative)" agent-capacity read-out only (Team-out tab) — it is deliberately isolated from vFTE/savings by design. AI-FinOps is one illustrative row inside the Agentic Run team breakdown (Team-out and Agent-detail tabs).</p>
    </Panel>
  );
}
