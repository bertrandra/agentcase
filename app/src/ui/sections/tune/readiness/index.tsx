import { useState } from 'react';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Assessment } from './Assessment';
import { HriPanel } from './HriPanel';
import { ScoreCard } from './ScoreCard';

const help = (
  <>
    <p><strong>Dimension score</strong> = average of its statements (No = 0, Partial = 50, Yes = 100). <strong>AI Readiness Index</strong> = average of the 10 dimension
      scores (equal weight): Documentation · Process Maturity · DevOps · Cloud · Security · Data Quality · Governance · SDLC · Architecture · Skills.</p>
    <p>Low-scoring dimensions are the prerequisites to raise before (or alongside) an agentic AI roll-out — they typically translate into a higher glass ceiling and a slower adoption ramp.</p>
    <p>When Human Readiness is enabled, the S-curve ramp is multiplied by max(ramp floor, floor + slope × HRI ÷ 100): a low-readiness organisation adopts more slowly even at full technical capability.
      Defaults 0.6 and 0.4, so a perfect HRI = 100 reaches 1.0 (no drag). Both coefficients are shared with the Due-diligence register.</p>
  </>
);

/** AI Readiness Index (assessment questionnaire, radar) and the Human Readiness Index with its change cost and adoption drag. */
export default function ReadinessSection() {
  const [tab, setTab] = useState<'hri' | 'assess'>('hri');
  return (
    <SectionFrame title="AI Readiness Index" help={help}
      input={
        <>
          <p>A quick online assessment of how ready your organization is to industrialize agentic AI in software delivery. Answer the statements below (No / Partial / Yes). The index (0–100) and the radar chart update live. Weak dimensions are your transformation pre-requisites.</p>
          <div role="tablist" className="ac-form-row">
            <button type="button" role="tab" aria-selected={tab === 'hri'} onClick={() => setTab('hri')}>🧑‍🤝‍🧑 Human Readiness Index &amp; change cost</button>
            <button type="button" role="tab" aria-selected={tab === 'assess'} onClick={() => setTab('assess')}>Assessment questionnaire</button>
          </div>
          {tab === 'hri' ? <HriPanel /> : <Assessment />}
        </>
      }
      result={tab === 'assess' ? <ScoreCard /> : undefined} />
  );
}
