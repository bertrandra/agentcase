import type { ReactNode } from 'react';
import { fmtPayback, roiVerdict, yLabel, type EconomicsView, type Verdict } from '@/domain/economics';
import { fmtK } from '@/ui/economicsFormat';

const BOX: Record<Verdict, { bg: string; border: string }> = {
  go: { bg: 'linear-gradient(135deg,var(--ac-success-30),var(--ac-success-25))', border: 'var(--ac-success-175)' },
  conditional: { bg: 'linear-gradient(135deg,var(--ac-warning-25),var(--ac-warning-10))', border: 'var(--ac-warning-150)' },
  reconsider: { bg: 'linear-gradient(135deg,var(--ac-danger-50),var(--ac-danger-25))', border: 'var(--ac-danger-225)' },
};

function recoText(v: EconomicsView, kind: Verdict): [string, string] {
  const pct = Math.round((v.roi ?? 0) * 100), last = v.years[v.H - 1];
  if (kind === 'go') return ['Recommendation : GO 🚀', `Net ROI ${pct}%, payback ${v.payback || '—'} months. Reduction ${(v.baseFte - (last?.humanFteEnd ?? 0)).toFixed(1)} FTE (by ${yLabel(v.H)}).`];
  if (kind === 'conditional') return ['Conditional GO ⚠️', `Net ROI ${pct}% positive but moderate. Secure automation & glass ceiling.`];
  return ['Reconsider 🔴', `Net ROI ${pct}% insufficient. Revisit scope, horizon or setup.`];
}

const Line = ({ k, children }: { k: string; children: ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0', borderBottom: '1px dashed var(--ac-primary-200)' }}><span>{k}</span><span style={{ color: 'var(--ac-blue)', fontWeight: 'var(--ac-font-weight-semibold)' }}>{children}</span></div>
);

/** GO / conditional / reconsider box and the "how ROI is computed" walk-through with this case's live values. */
export function Reco({ v }: { v: EconomicsView }) {
  const kind = roiVerdict(v.roi), [head, body] = recoText(v, kind), box = BOX[kind], pct = Math.round((v.roi ?? 0) * 100), rate = Math.round(v.npvRate * 100);
  const arrows = (f: (i: number) => string) => v.years.map((_, i) => f(i)).join(' → ');
  return (
    <>
      <div role="status" style={{ borderRadius: 'var(--ac-radius-lg)', padding: '1.25rem', textAlign: 'center', marginTop: '.75rem', background: box.bg, border: `1px solid ${box.border}` }} data-verdict={kind}>
        <div style={{ fontSize: 'var(--ac-font-size-3xl)', fontWeight: 'var(--ac-font-weight-bold)', color: 'var(--ac-blue)', marginBottom: '.5rem' }}>{head}</div>
        <div style={{ fontSize: 'var(--ac-font-size-base)', color: 'var(--ac-neutral-650)' }}>{body}</div>
      </div>
      <div style={{ marginTop: '.9rem', background: 'var(--ac-primary-80)', border: '1px solid var(--ac-primary-200)', borderLeft: '4px solid var(--ac-blue)', borderRadius: 'var(--ac-radius-lg)', padding: '1rem 1.15rem' }}>
        <div style={{ fontWeight: 'var(--ac-font-weight-bold)', color: 'var(--ac-blue)', marginBottom: '.5rem' }}>🧮 How ROI is computed (live values)</div>
        <Line k="1. AS-IS baseline run (payroll only)">{fmtK(v.baselineRun)} / yr</Line>
        <Line k={`2. TO-BE run ${yLabel(1)} → ${yLabel(v.H)} (residual team + tokens + infra + agentic run team)`}>{arrows((i) => fmtK((v.years[i]?.totalRunCost) as number))}</Line>
        <Line k="3. Savings = baseline − TO-BE, per year">{arrows((i) => fmtK((v.years[i]?.savings) as number))}</Line>
        <Line k={`4. Σ savings over ${v.H} year${v.H > 1 ? 's' : ''}`}>{fmtK(v.totalBenefit)}</Line>
        <Line k="5. One-time setup (tooling + training + coaching + governance)">{fmtK(v.setup)}</Line>
        <Line k="ROI (net) = (Σ savings − setup) / setup">({fmtK(v.totalBenefit)} − {fmtK(v.setup)}) / {fmtK(v.setup)} = <span style={{ color: 'var(--ac-teal)' }}>{pct}%</span></Line>
        <Line k="Payback = first month cumulative cash-flow ≥ 0">{fmtPayback(v.payback, v.months.length).replace(/ mo$/, ' months')}</Line>
        <Line k={`NPV @${rate}%/yr = Σ monthly (saving − setup spend), discounted`}>{fmtK(v.npv)}</Line>
        <div style={{ fontSize: 'var(--ac-font-size-sm)', color: 'var(--ac-slate-650)', marginTop: '.5rem' }}>Y1 savings are typically negative (ramp at {v.m.ramps[0]}% while the agentic run team and infra are paid in full) — the J-curve. Every figure updates live with your parameters.</div>
      </div>
    </>
  );
}
