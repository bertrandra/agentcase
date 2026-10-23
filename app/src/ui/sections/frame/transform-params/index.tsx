import { setIndustry, setRegUse } from '@/controllers/frame';
import { INDUSTRIES, industryLabel } from '@/domain/frame';
import { useDoc } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { Field } from '@/ui/widgets/fields';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';
import { FieldToggle } from '@/ui/widgets/field/FieldToggle';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CrossCutting } from './CrossCutting';
import { NormsPanel } from './NormsPanel';

const OVERRIDES = ['selectedNorms', 'regInclude', 'selectedRegArtefacts'] as const;
const INDUSTRY_OPTIONS = INDUSTRIES.map((i) => ({ value: i.code, label: industryLabel(i) }));

const help = (
  <>
    <p>Picking an industry profile adds its <strong>regulatory artefacts</strong> to the scope: <code>glass ceiling</code> = Σ(w × humanSup) / Σw, now over the SDLC and the regulatory artefacts.
      Switch the catalogue on, pick the industry (it pre-checks all its norms) and refine the norm list.</p>
    <p>Cross-cutting concerns (AI, sustainability, usability) are independent of the industry and survive industry switches. If a regulated case shows the same ceiling as an
      unregulated one, the catalogue is almost certainly still switched off — the most common setup error here.</p>
    <p>“Include reg. artifacts in effort &amp; runs” off keeps them in the glass ceiling only.</p>
  </>
);

/** Industry / regulatory profile — regulatory catalogue, norms and cross-cutting concerns that add regulated artefacts to the scope. */
export default function TransformParamsSection() {
  const industry = useDoc((d) => d.dom.values.industry ?? 'NONE'), use = useDoc((d) => !!d.regUse);
  return (
    <SectionFrame title="🏛️ Industry / regulatory profile" help={help} overrides={OVERRIDES}
      input={
        <>
          <Panel title="Industry / regulatory profile">
            <FieldChoice label="Industry / regulatory profile" value={industry} options={INDUSTRY_OPTIONS} onChange={setIndustry}>
              <Field label="Industry / regulatory profile">
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}>{INDUSTRIES.map((i) => <option key={i.code} value={i.code}>{industryLabel(i)}</option>)}</select>
              </Field>
            </FieldChoice>
            <FieldToggle label="🏛️ Use Regulatory catalog" checked={use} onChange={setRegUse}>
              <label className="ac-check"><input type="checkbox" checked={use} onChange={(e) => setRegUse(e.target.checked)} /> 🏛️ Use Regulatory catalog</label>
            </FieldToggle>
            {use && <NormsPanel />}
          </Panel>
          <CrossCutting />
        </>
      } />
  );
}
