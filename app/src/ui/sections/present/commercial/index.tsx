import { useMemo } from 'react';
import { commercialView, cmRecommend, cmRuleText, CM_DEFS, mcConfidenceOf } from '@/domain/pdc/commercial';
import { useSimulation } from '@/store/simulation';
import { engagementKey } from '@/domain/engagement';
import { useCtx, useDoc } from '@/store/hooks';
import { fmtK } from '@/ui/economicsFormat';
import { Callout } from '@/ui/widgets/cards';
import { NumberInput, SelectInput } from '@/ui/widgets/fields';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CmDetail } from './CmDetail';
import { CmTable } from './CmTable';

const help = (
  <>
    <p>Decides how the value created is sold, and therefore how it splits between client and supplier. Same delivery, four commercial framings: Effort &amp;
      Tools, AI-Augmented Humans, Agentshore (capacity tiers T0/T1/T2) and Gain sharing.</p>
    <p>Every model is shown from both sides (client price, supplier margin). Availability follows the engagement context: gain sharing needs full control
      (MSC), Agentshore needs a managed service.</p>
  </>
);

const MODELS = [['ET', 'ET — Effort & Tools'], ['AAH', 'AAH — AI-Augmented Humans'], ['AGS', 'AGS — Agentshore (mixed teams)'], ['GS', 'GS — Gain sharing']]
  .map(([value, label]) => ({ value: value!, label: label! }));

/** Commercial model — the four selling models compared on revenue, margin and client saving. */
export default function CommercialSection() {
  const c = useCtx(), v = useMemo(() => commercialView(c), [c]), sel = useDoc((d) => d.dom.values.cmModel || 'ET');
  const { run, stale } = useSimulation(), rec = cmRecommend(c, mcConfidenceOf(stale ? null : run)), k = engagementKey(c);
  return (
    <SectionFrame title="Commercial model" help={help}
      input={<div className="ac-form-row">
        <SelectInput id="cmModel" label="Model" options={MODELS} />
        <NumberInput id="cmUplift" label="AAH uplift (%)" min={0} max={60} />
        <NumberInput id="cmToolMarkup" label="ET tooling markup (%)" min={0} max={50} />
        <NumberInput id="cmVfteRatio" label="AGS vFTE billing ratio" min={0} max={1} step={0.05} />
        <NumberInput id="cmPricePoint" label="AGS €/capacity pt (blank = auto)" min={0} step={100} />
        <NumberInput id="cmBaseDisc" label="GS base discount (%)" min={0} max={60} />
        <NumberInput id="cmGainShare" label="GS gain share (%)" min={0} max={80} />
      </div>}
      result={<>
        <CmTable v={v} sel={sel} />
        <CmDetail v={v} sel={sel} />
        <Callout><strong>Recommended for this case:</strong> {CM_DEFS[rec[0]].label} — {rec[1]}. <span
          className="ac-muted">(rule: {cmRuleText()})</span></Callout>
        <p className="ac-muted">Absorbed (non-billable) setup under {k}: {fmtK(v.absorbed)} — excluded from the margin above, carried as investment
          (CC-CTX-03).</p>
      </>} />
  );
}
