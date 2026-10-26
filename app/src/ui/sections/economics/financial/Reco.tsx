import type { ReactNode } from 'react';
import { fmtPaybackMonths, fmtRoiPct, roiVerdict, yLabel, type EconomicsView, type Verdict } from '@/domain/economics';
import { fmtK } from '@/ui/economicsFormat';


function recoText(v: EconomicsView, kind: Verdict): [string, string] {
  // the legacy sentence reads a missing ROI (no setup) as 0 %
  const pct = fmtRoiPct(v.roi ?? 0), pb = fmtPaybackMonths(v.paybackShown, v.months.length);
  if (kind === 'go') return ['Recommendation : GO 🚀', `Net ROI ${pct}, payback ${pb}. Reduction ${v.fte.freed.toFixed(1)} FTE (by ${yLabel(v.H)}).`];
  if (kind === 'conditional') return ['Conditional GO ⚠️', `Net ROI ${pct} positive but moderate. Secure automation & glass ceiling.`];
  return ['Reconsider 🔴', `Net ROI ${pct} insufficient. Revisit scope, horizon or setup.`];
}

const Line = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="ac-reco-line"><span>{k}</span><span className="ac-reco-line-v">{children}</span></div>
);

/** GO / conditional / reconsider box and the "how ROI is computed" walk-through with this case's live values. */
export function Reco({ v }: { v: EconomicsView }) {
  const kind = roiVerdict(v.roi), [head, body] = recoText(v, kind), pct = fmtRoiPct(v.roi ?? 0), rate = Math.round(v.npvRate * 100);
  const arrows = (f: (i: number) => string) => v.years.map((_, i) => f(i)).join(' → ');
  return (
    <>
      <div role="status" className="ac-reco" data-verdict={kind}>
        <div className="ac-reco-head">{head}</div>
        <div className="ac-reco-body">{body}</div>
      </div>
      <div className="ac-reco-how">
        <div className="ac-reco-how-title">🧮 How ROI is computed (live values)</div>
        <Line k="1. AS-IS baseline run (payroll only)">{fmtK(v.baselineRun)} / yr</Line>
        <Line k={`2. TO-BE run ${yLabel(1)} → ${yLabel(v.H)} (residual team + tokens + infra + agentic run team)`}>
          {arrows((i) => fmtK((v.years[i]?.totalRunCost) as number))}</Line>
        <Line k="3. Savings = baseline − TO-BE, per year">{arrows((i) => fmtK((v.years[i]?.savings) as number))}</Line>
        <Line k={`4. Σ savings over ${v.H} year${v.H > 1 ? 's' : ''}`}>{fmtK(v.totalBenefit)}</Line>
        <Line k="5. One-time setup (tooling + training + coaching + governance, + HRI change and hub setup when on)">{fmtK(v.setup)}</Line>
        <Line k="ROI (net) = (Σ savings − setup) / setup">({fmtK(v.totalBenefit)} − {fmtK(v.setup)})
          / {fmtK(v.setup)} = <span className="ac-reco-roi">{pct}</span></Line>
        <Line k="Payback = first month cumulative cash-flow ≥ 0">{fmtPaybackMonths(v.paybackShown, v.months.length)}</Line>
        <Line k={`NPV @${rate}%/yr = Σ monthly (saving − setup spend), discounted`}>{fmtK(v.npv)}</Line>
        <div className="ac-reco-note">Y1 savings are typically negative (ramp at {v.m.ramps[0]}% while the agentic run team and infra are paid in full) — the
          J-curve. Every figure updates live with your parameters.</div>
      </div>
    </>
  );
}
