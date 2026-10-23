import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import type { Decision } from '@/domain/verdict';
import { VERDICT_META } from '@/domain/verdict';
import { usePortfolioSimulation } from '@/store/portfolioSimulation';
import { Callout } from '@/ui/widgets/cards';
import { fmtEur } from '../../stress/fmt';

/** The confidence-conditional verdict of the selection (portfolio Monte Carlo), or the invitation to run it: never a point-based verdict. */
export function AggBanner({ d, label }: { d: Decision | null; label: string }) {
  const { stale } = usePortfolioSimulation();
  if (!d) {
    return (
      <div className="ac-callout" style={{ borderStyle: 'dashed' }}>
        Probabilistic verdict of {label} not yet computed — <button type="button" onClick={() => { void runPortfolioSimulation(); }}>▶ Run portfolio simulation</button> to add the confidence-conditional recommendation.
        The figures below are the deterministic view.
      </div>
    );
  }
  const meta = VERDICT_META[d.verdict];
  return (
    <>
      {stale && <Callout kind="warn">⚠️ <strong>The portfolio changed since the last simulation</strong> — the verdict below is stale.</Callout>}
      <div style={{ border: `2px solid ${meta.color}`, background: meta.bg, borderRadius: 'var(--ac-radius-xl)', padding: '12px 16px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 'var(--ac-font-size-2xl)', fontWeight: 'var(--ac-font-weight-bold)', color: meta.color }}>{meta.icon} {meta.label}</div>
        <div><strong style={{ color: meta.color }}>{d.confidence}%</strong> confidence · downside P10 <strong>{fmtEur(d.stats.p10)}</strong> · median P50 <strong>{fmtEur(d.stats.p50)}</strong></div>
      </div>
    </>
  );
}
