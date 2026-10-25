import { useMemo } from 'react';
import { supervisionSplit } from '@/domain/tuneB/runSizing';
import { useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { CoefInput } from '@/ui/widgets/CoefInput';
import { fix } from '../../tuneB/fmt';

/** Human supervision share: cap and factor (shared with the Due-diligence register) and the resulting dev / supervision split. */
export function SupervisionShare() {
  const c = useCtx(), t = useMemo(() => supervisionSplit(c), [c]);
  return (
    <Panel title="Human supervision share" aside={<Badge tone="amber">v18.7</Badge>}>
      <p className="ac-muted">Not the AgentOps team above — this splits the <strong>residual project team</strong> (the humans this transformation
        leaves in place) into people who still <em>deliver</em> vs. people who <em>supervise agent output</em>. Same "Target Team" breakdown shown on
        the Team-out tab.</p>
      <div className="ac-form-row">
        <CoefInput coef="supShareCap" domId="runSupShareCap" label="Supervision share cap" max={1} step={0.05} />
        <CoefInput coef="supShareFactor" domId="runSupShareFactor" label="Supervision share factor" max={2} step={0.05} />
        <span aria-live="polite">→ {fix(t.devETP, 1)} dev + {fix(t.supETP, 1)} supervision FTE (of {fix(t.residualETP, 1)} residual, {t.endLabel})</span>
      </div>
      <p className="ac-muted">supShare = min(cap, avg. human supervision × factor). Also editable from the Due-diligence register — both controls share the same
        value.</p>
    </Panel>
  );
}
