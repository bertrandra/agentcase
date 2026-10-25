// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ChartConfiguration } from 'chart.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeCtx } from '@/domain';
import { evaluateStrategies, stratNormalize, stratWeightsOf } from '@/domain/verdict';
import { appStore } from '@/store/instance';
import { Ranking } from '@/ui/sections/verdict/strategies/Ranking';
import { openFixture } from '../../helpers/stressParity';

const seen: ChartConfiguration[] = [];
vi.mock('@/ui/widgets/ChartPanel', () => ({
  ChartPanel: ({ config, label }: { config: ChartConfiguration; label: string }) => { seen.push(config); return <canvas role="img" aria-label={label} />; },
}));
afterEach(() => { cleanup(); seen.length = 0; });

describe('strategy ranking radar', () => {
  it('keeps the same chart config across re-renders with the same ranking (the default top-3 selection is memoised)', () => {
    openFixture('golden');
    const c = makeCtx(appStore().getState().doc), W = stratWeightsOf(c.s), N = stratNormalize(evaluateStrategies(c), W);
    const { rerender } = render(<Ranking N={N} W={W} />);
    rerender(<Ranking N={N} W={W} />);
    rerender(<Ranking N={N} W={W} />);
    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(new Set(seen).size).toBe(1);   // before the fix: a new selection array each render, so a new config (and a rebuilt chart) each time
    // a real change of the selection still builds a new config
    fireEvent.click(screen.getByRole('checkbox', { name: `Show ${N[3]!.label} on the radar` }));
    expect(new Set(seen).size).toBe(2);
    expect(seen.at(-1)!.data.datasets).toHaveLength(4);
  });
});
