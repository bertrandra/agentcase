// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeCase, makeCtx, model } from '@/domain';
import { consolidate, portfolioHeadline } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { kpi, mountApp } from '../helpers/portfolioUi';
import { threeProducts } from '../helpers/portfolioStore';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));
beforeEach(() => { threeProducts(); });
afterEach(cleanup);

describe('top bar: total FTE before and after', () => {
  it('product scope: before = entry team, after = horizon-end human FTE incl. the agentic run team, reduction in the tooltip', () => {
    mountApp();
    const doc = appStore().getState().doc, r = computeCase(doc), c = makeCtx(doc);
    expect(kpi(/^FTE before$/)).toBe(model(c).base.etp.toFixed(1));
    expect(kpi(/^FTE after Y\d+$/)).toBe(r.fte.after.toFixed(1));
    expect(r.fte.before).toBe(model(c).base.etp);
    expect(screen.getByText(/^FTE after Y/).parentElement!.getAttribute('title')).toMatch(/Reduction: \d+%/);
  });
  it('portfolio scope: sums over the planned products and equals the domain headline', () => {
    mountApp();
    fireEvent.change(screen.getByRole('combobox', { name: 'View' }), { target: { value: 'portfolio' } });
    const pf = appStore().getState().portfolio, h = portfolioHeadline(consolidate(pf));
    expect(kpi(/^FTE before$/)).toBe(h.fte.before.toFixed(1));
    expect(kpi(/^FTE after Y\d+$/)).toBe(h.fte.after.toFixed(1));
    const sum = consolidate(pf).products.reduce((a, v) => a + v.run.baseEtp, 0);
    expect(h.fte.before).toBeCloseTo(sum, 9);
  });
});
