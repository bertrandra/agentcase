import { useEffect } from 'react';
import { runSimulation } from '@/controllers/stress';
import { useDoc } from '@/store/hooks';
import { useSimulation } from '@/store/simulation';
import { Callout } from '@/ui/widgets/cards';

/** Legacy mcAutoHook: when the scenario moved after a run and auto re-run is on, re-run once the inputs settle (500 ms). */
export function useAutoRerun(): void {
  const { run, stale, auto } = useSimulation(), doc = useDoc((d) => d);
  useEffect(() => {
    if (!run || !stale || !auto) return;
    const t = setTimeout(() => runSimulation(), 500);
    return () => clearTimeout(t);
  }, [run, stale, auto, doc]);
}

/** Shown on every screen that displays the distribution or the verdict when the scenario has changed since the last run. */
export function StaleBanner() {
  const { stale } = useSimulation();
  if (!stale) return null;
  return (
    <Callout kind="warn">
      ⚠️ <strong>Scenario changed since the last run</strong> — the distribution and verdict below are stale.{' '}
      <button type="button" onClick={() => runSimulation()}>⟳ Re-run now</button>
    </Callout>
  );
}
