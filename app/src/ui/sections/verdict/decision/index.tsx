import { useMemo } from 'react';
import { runSimulation } from '@/controllers/stress';
import { decide } from '@/domain/verdict';
import { useCtx } from '@/store/hooks';
import { useVerdictGroup } from '@/store/portfolioSimulation';
import { useSimulation } from '@/store/simulation';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { useAutoRerun } from '../../stress/useSimulation';
import { Method } from './Method';
import { PortfolioVerdict } from './PortfolioVerdict';
import { VerdictBox } from './VerdictBox';

const help = (
  <p>One verdict, computed from the Monte Carlo distribution — never from a single point estimate. The recommendation is conditional on confidence, always displays its own downside,
    and a coded invariant makes a contradiction between “recommended” and “worst case very risky” structurally impossible.</p>
);

/** Decision Intelligence — verdict from the distribution. */
export default function DecisionSection() {
  const c = useCtx(), { run } = useSimulation(), d = useMemo(() => (run ? decide(c, run) : null), [c, run]), group = useVerdictGroup();
  useAutoRerun();
  if (group) {   // display scope Portfolio / Wave: the same rule on the portfolio distribution
    return <SectionFrame title="🧭 Decision Intelligence — verdict from the distribution" help={help} result={<PortfolioVerdict group={group} />} />;
  }
  return (
    <SectionFrame title="🧭 Decision Intelligence — verdict from the distribution" help={help}
      result={<>
        {d && isFinite(d.stats.p10) ? <VerdictBox d={d} /> : (
          <p className="ac-muted"><em>{d ? 'The net benefit is not defined for a horizon beyond 3 years (legacy limitation): no verdict can be computed.' : (
            <>Run the Monte Carlo simulation first (Analyze → 🎲 Monte Carlo) — the recommendation is computed from the distribution, never from a single point.{' '}
              <button type="button" onClick={() => runSimulation(1000)}>▶ Run now</button></>)}</em></p>
        )}
        <Method />
      </>} />
  );
}
