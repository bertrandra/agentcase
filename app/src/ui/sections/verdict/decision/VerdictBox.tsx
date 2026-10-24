import type { ReactNode } from 'react';
import { DI_THRESHOLDS, VERDICT_META, type Decision } from '@/domain/verdict';
import { DataTable } from '@/ui/widgets/DataTable';
import { fmtEur } from '../../stress/fmt';
import { StaleBanner } from '../../stress/useSimulation';

/** The verdict with its own risk, the conditions derived from the top risk drivers, the business context read, and the rules applied. */
export function VerdictBox({ d, banner = <StaleBanner /> }: { d: Decision; banner?: ReactNode }) {
  const meta = VERDICT_META[d.verdict], s = d.stats, pct = (x: number) => Math.round(x * 100);
  return (
    <>
      {banner}
      <div className="ac-verdict ac-verdict-full" data-tone={meta.tone} data-bg-tone={meta.bgTone}>
        <div className="ac-verdict-head">
          <div className="ac-verdict-label">{meta.icon} {meta.label}</div>
          <div className="ac-verdict-conf">{d.confidence}% confidence <span className="ac-regular">= P(net benefit &gt; 0)</span></div>
        </div>
        <div className="ac-verdict-sub">
          {meta.sub} · The verdict always carries its risk: downside P10 = <strong className={s.p10 < 0 ? 'ac-loss' : undefined}>{fmtEur(s.p10)}</strong>,
          {' '}median P50 = <strong>{fmtEur(s.p50)}</strong>, CVaR&nbsp;10% = <strong>{fmtEur(s.cvar10)}</strong>.</div>
      </div>
      {d.conditions.length > 0 && (<><h3>Conditions (top risk drivers)</h3><ul>{d.conditions.map((x) => <li key={x}>{x}</li>)}</ul></>)}
      <h3>Business context read by the engine</h3>
      <DataTable rows={d.ctx} rowKey={(x) => x.k} columns={[{ key: 'k', header: 'Signal', render: (x) => x.k }, { key: 'v', header: 'Value', render: (x) => <strong>{x.v}</strong> }]} />
      <p className="ac-muted">Decision rules: <strong>Recommended</strong> requires P(net&gt;0) ≥ {pct(DI_THRESHOLDS.strongPPos)}% AND P10 &gt; −{pct(DI_THRESHOLDS.p10SetupMult)}% of setup ({fmtEur(d.p10Floor)}).
        {' '}<strong>Conditional</strong> from {pct(DI_THRESHOLDS.condPPos)}%. <strong>Coherence invariant (enforced in code):</strong> a Recommended verdict is impossible when P(net&lt;0) &gt; {pct(DI_THRESHOLDS.maxPNegForStrong)}%
        {' '}— the recommendation and the distribution can never contradict each other, because the former is computed from the latter.</p>
    </>
  );
}
