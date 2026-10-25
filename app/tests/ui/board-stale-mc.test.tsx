// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { runSimulation } from '@/controllers/stress';
import { makeCtx } from '@/domain';
import { variableById } from '@/domain/pdc/variables';
import { appStore } from '@/store/instance';
import { runFor, simStore } from '@/store/simulation';
import { useVarRuntime } from '@/ui/sections/configure/board/runtime';
import { freshStore } from '../store/helpers';

afterEach(() => simStore.setState({ run: null }));

describe('Board dashboards never read a stale Monte Carlo run (lot 10)', () => {
  it('the runtime carries the last run only while it was made on this case; after an edit the Monte Carlo cards show a dash', () => {
    freshStore();
    act(() => runSimulation(200));
    const { result } = renderHook(() => useVarRuntime());
    const run = simStore.getState().run!, p50 = variableById('mcP50')!;
    expect(result.current.mc).toBe(run);
    expect(p50.get(makeCtx(appStore().getState().doc), result.current)).toBe(run.stats.p50);
    act(() => { setInput('y1Ramp', 77); });
    expect(simStore.getState().run).toBe(run);   // the run is kept (a stale banner elsewhere says so) ...
    expect(result.current.mc).toBeNull();          // ... but no Board card shows it as current
    expect(p50.get(makeCtx(appStore().getState().doc), result.current)).toBeNull();
    expect(runFor(run, appStore().getState().doc)).toBeNull();
    act(() => runSimulation(200));
    expect(result.current.mc).toBe(simStore.getState().run);
  });
});
