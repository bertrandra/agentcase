import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import type { Decision } from '@/domain/verdict';
import { usePortfolioSimulation } from '@/store/portfolioSimulation';
import { Callout } from '@/ui/widgets/cards';
import { NotComputed, VerdictBox } from './Parts';

/** The confidence-conditional verdict of the selection (portfolio Monte Carlo), or the invitation to run it: never a point-based verdict. */
export function AggBanner({ d, label }: { d: Decision | null; label: string }) {
  const { stale } = usePortfolioSimulation();
  if (!d) {
    return <NotComputed what={`Probabilistic verdict of ${label}`}
      run={<button type="button" onClick={() => { void runPortfolioSimulation(); }}>▶ Run portfolio simulation</button>} />;
  }
  return (
    <>
      {stale && <Callout kind="warn">⚠️ <strong>The portfolio changed since the last simulation</strong> — the verdict below is stale.</Callout>}
      <VerdictBox d={d} />
    </>
  );
}
