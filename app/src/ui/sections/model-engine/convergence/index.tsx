import { enableLce, recalibrateLce, setLceFallback, setLceNMax } from '@/controllers/modelEngine';
import { lceModel } from '@/domain/model/lce';
import { useCtx } from '@/store/hooks';
import { toast } from '@/ui/uiState';
import { NumField } from '@/ui/widgets/CommitField';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { PhaseBanner, PhaseSwitch } from '../shared';
import { LoopTable } from './LoopTable';

const help = (
  <>
    <p>Every agentic loop pair (a generating agent paired with its verifier) used to carry a flat iteration count. This tab replaces that assertion with a derivation:
      the count becomes E[N], the expected attempts per accepted artifact, from one measurable input, the first-pass acceptance rate p (truncated geometric, capped at nmax).</p>
    <p>Enabling the phase calibrates p so E[N] reproduces the legacy counts exactly; you then edit p. The surface is display-only: it never changes the euro business case.
      Checks CC-LC-01 (1 ≤ E[N] ≤ nmax), CC-LC-02 (calibration residual) and CC-LC-03 (escape rate above 5% needs a costed fallback) fire once the phase is on.</p>
  </>
);

/** P1 — loop convergence economics: E[N], escape rate, cost per accepted artifact and review share per agentic loop pair. */
export default function ModelConvergenceSection() {
  const c = useCtx(), on = !!c.s.MODEL.FLAGS.lce, m = lceModel(c);
  return (
    <SectionFrame title="🔁 Loop convergence economics · P1 · v16.5" help={help}
      input={<>
        <Callout>Turns each agentic loop pair&apos;s fixed iteration count into <strong>E[N]</strong> — the expected attempts per accepted artifact — derived from a first-pass acceptance rate <em>p</em> (truncated-geometric, capped at
          n<sub>max</sub>). Enabling the phase calibrates <em>p</em> so E[N] reproduces today&apos;s counts exactly; then edit <em>p</em>, a number your engineers can measure on a pilot. This surface is <strong>display-only</strong> — it never changes the euro business case. (AME-SPEC v0.2, P1)</Callout>
        <div className="ac-form-row">
          <PhaseSwitch on={on} phase="P1" onToggle={() => enableLce(!on)} />
          <button type="button" title="Re-solve p from the legacy iteration counts" onClick={() => {
            const moved = recalibrateLce(), n = c.s.MODEL.LCE.nMax || 5;
            toast(moved ? `↻ p re-solved from the legacy iteration counts (nₘₐₓ = ${n})` : `↻ Already calibrated — p unchanged at nₘₐₓ = ${n}`);
          }}>↻ Recalibrate p</button>
          <NumField label="Iteration cap nmax" value={m.nMax} min={1} max={10} step={1} width={74} onCommit={setLceNMax} />
          <NumField label="Fallback cost / escape (€)" value={c.s.MODEL.LCE.fallbackCost || 0} min={0} step={100} width={110} onCommit={setLceFallback} />
          <span aria-live="polite">Weighted E[N] <strong>{m.weightedEN.toFixed(2)}</strong> · escape <strong>{m.escapePct.toFixed(1)}%</strong> · review share <strong>{(m.reviewShare * 100).toFixed(0)}%</strong> · {m.calibrated ? <span style={{ color: 'var(--ac-teal)' }}>calibrated ✓</span> : <span style={{ color: 'var(--ac-brick)' }}>uncalibrated</span>}</span>
        </div>
        <PhaseBanner on={on} off=" — the model uses the legacy fixed iteration counts. The table previews what enabling P1 would compute (p calibrated to today's counts).">
          Each loop&apos;s iteration count is now E[N] from its acceptance rate p. Calibrated so E[N] reproduces the legacy counts at switch-on — edit p to move off the baseline. Still display-only: the euro business case is unchanged.
        </PhaseBanner>
      </>}
      result={<LoopTable on={on} />} />
  );
}
