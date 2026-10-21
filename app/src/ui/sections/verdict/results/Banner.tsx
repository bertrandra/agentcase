import { useMemo } from 'react';
import { runSimulation } from '@/controllers/stress';
import { decide, VERDICT_META } from '@/domain/verdict';
import { useCtx } from '@/store/hooks';
import type { SimRun } from '@/store/simulation';
import { fmtEur } from '../../stress/fmt';
import { StaleBanner } from '../../stress/useSimulation';

/** The confidence-conditional verdict (only when a Monte Carlo run exists — never a stale or point-based verdict), or the invitation to run it. */
export function VerdictBanner({ run }: { run: SimRun | null }) {
  const c = useCtx(), d = useMemo(() => (run ? decide(c, run) : null), [c, run]);
  if (!d) {
    return (
      <div className="ac-callout" style={{ borderStyle: 'dashed' }}>
        Probabilistic verdict not yet computed — <button type="button" onClick={() => runSimulation(1000)}>▶ Run Monte Carlo</button> to add the confidence-conditional recommendation.
        The figures below are the deterministic view.
      </div>
    );
  }
  const meta = VERDICT_META[d.verdict];
  return (
    <>
      <StaleBanner />
      <div style={{ border: `2px solid ${meta.color}`, background: meta.bg, borderRadius: 10, padding: '12px 16px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: meta.color }}>{meta.icon} {meta.label}</div>
        <div><strong style={{ color: meta.color }}>{d.confidence}%</strong> confidence · downside P10 <strong>{fmtEur(d.stats.p10)}</strong> · median P50 <strong>{fmtEur(d.stats.p50)}</strong></div>
      </div>
    </>
  );
}
