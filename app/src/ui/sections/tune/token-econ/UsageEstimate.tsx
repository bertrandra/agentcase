import { useMemo } from 'react';
import { tokenUsage } from '@/domain/tuneB/tokens';
import { setTokenOutShare } from '@/controllers/tuneB';
import { useCtx, useDoc } from '@/store/hooks';
import { Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { Field, NumberInput } from '@/ui/widgets/fields';
import { eur, int } from '../../tuneB/fmt';

/** Token usage estimate: volume drivers (tokens per run, runs per day, output share) and the horizon-end figures. */
export function UsageEstimate() {
  const c = useCtx(), u = useMemo(() => tokenUsage(c), [c]);
  const share = useDoc((d) => d.TOK_OUT_SHARE), L = u.endLabel;
  return (
    <Panel title="🔢 Token usage estimate (context-driven)">
      <p className="ac-muted">Annual token volume is estimated <strong>per artifact</strong> — the most relevant driver, since the whole model is artifact-centric. Volume is aligned on the number of agent executions = agent workforce (agent vFTE = team × automation depth × ramp) × working days/year × agent runs/day, scaled by the in-scope scope share, × tokens per agent run, then split input / output by the share below.
        Defaults are indicative — calibrate runs/day and tokens per run from your real platform billing (e.g. Claude Code usage). This estimate and the model mix feed the blended €/1M used by Run, Setup, ROI and FinOps.</p>
      <div className="ac-form-row">
        <NumberInput id="tokensPerArt" label="Tokens per agent run" step={5000} />
        <NumberInput id="runsPerDay" label="Agent runs / day (per agent-FTE)" step={1} />
        <Field label={`Output token share (%): ${Math.round(share)}%`}>
          <input type="range" aria-label="Output token share" min={0} max={100} value={share} onChange={(e) => setTokenOutShare(e.target.value)} />
        </Field>
        <Field label="Estimation driver"><input type="text" value="Per artifact (scope-aware)" disabled readOnly /></Field>
      </div>
      <StatRow>
        <Stat label={`Agent runs ${L}`} value={int(u.runsY3)} />
        <Stat label={`Est. tokens ${L}`} value={`${int(u.y3)} M`} />
        <Stat label="Input / Output" value={`${Math.round(u.inputM)} M / ${Math.round(u.outputM)} M`} />
        <Stat label="Blended price" value={`${eur(u.blended)} /1M`} tone="teal" />
        <Stat label={`Token cost ${L}`} value={eur(u.costY3)} tone="amber" />
        <Stat label="Output share" value={`${Math.round(share)}%`} tone="grey" />
      </StatRow>
    </Panel>
  );
}
