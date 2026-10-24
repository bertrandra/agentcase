import { useMemo } from 'react';
import { runSimulation } from '@/controllers/stress';
import { decide } from '@/domain/verdict';
import { useCtx } from '@/store/hooks';
import type { SimRun } from '@/store/simulation';
import { StaleBanner } from '../../stress/useSimulation';
import { NotComputed, VerdictBox } from './Parts';

/** The confidence-conditional verdict (only when a Monte Carlo run exists — never a stale or point-based verdict), or the invitation to run it. */
export function VerdictBanner({ run }: { run: SimRun | null }) {
  const c = useCtx(), d = useMemo(() => (run ? decide(c, run) : null), [c, run]);
  if (!d) {
    return <NotComputed what="Probabilistic verdict" run={<button type="button" onClick={() => runSimulation(1000)}>▶ Run Monte Carlo</button>} />;
  }
  return (
    <>
      <StaleBanner />
      <VerdictBox d={d} />
    </>
  );
}
