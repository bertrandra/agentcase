// @vitest-environment jsdom
import { Suspense, lazy } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTeamTotal } from '@/controllers/baseline';
import { setActiveProduct } from '@/controllers/product';
import { resolveProduct } from '@/domain/portfolio';
import { caseResultOf, useCaseResult, useCtx, useDoc } from '@/store/hooks';
import { appStore } from '@/store/instance';
import { ProductViewProvider } from '@/store/productView';
import { useActiveProduct, useActiveProductId } from '@/store/portfolioHooks';
import { useViewScope } from '@/store/viewScope';
import { ReadOnlyScope } from '@/ui/widgets/ReadOnlyScope';
import { threeProducts } from '../helpers/portfolioStore';
import { pf } from '../helpers/portfolioUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));

let ids: [string, string, string];
beforeEach(() => {
  ({ ids } = threeProducts());
  setActiveProduct(ids[1]); setTeamTotal(10); setActiveProduct(ids[0]);   // B has its own entry team; A is the active product
});
afterEach(cleanup);

function Probe() {
  const r = useCaseResult(), etp = useDoc((d) => d.teamIn.reduce((a, x) => a + x.etp, 0)), ctx = useCtx();
  const active = useActiveProduct(), id = useActiveProductId(), vs = useViewScope();
  return <p data-testid="p">{`${active.name}|${id}|${etp}|${r.endYear.savings}|${ctx.s.teamIn.length}|${vs.kind}`}</p>;
}
const text = () => screen.getByTestId('p').textContent;
const expected = (id: string) => {
  const c = resolveProduct(pf(), id), r = caseResultOf(c);
  return `${pf().products.find((p) => p.id === id)!.name}|${id}|${c.teamIn.reduce((a, x) => a + x.etp, 0)}|${r.endYear.savings}|${c.teamIn.length}|product`;
};

describe('ProductViewContext: one section component, rendered for a specific product, without touching the store', () => {
  it('outside the context the read hooks answer for the active product (unchanged)', () => {
    render(<Probe />);
    expect(text()).toBe(expected(ids[0]));
  });

  it('inside it they answer for that product\'s resolved case while the store\'s active product stays A', () => {
    const before = appStore().getState().doc;
    render(<ProductViewProvider productId={ids[1]}><Probe /></ProductViewProvider>);
    expect(text()).toBe(expected(ids[1]));
    expect(text()).not.toBe(expected(ids[0]));
    expect(appStore().getState().portfolio.activeProductId).toBe(ids[0]);
    expect(appStore().getState().doc).toBe(before);
  });

  it('follows edits of that product live, and an unknown product id falls back to the active product', () => {
    render(<ProductViewProvider productId={ids[2]}><Probe /></ProductViewProvider>);
    const first = text();
    act(() => { setActiveProduct(ids[2]); setTeamTotal(7); setActiveProduct(ids[0]); });
    expect(text()).toBe(expected(ids[2]));
    expect(text()).not.toBe(first);
    cleanup();
    render(<ProductViewProvider productId="ghost"><Probe /></ProductViewProvider>);
    expect(text()).toBe(expected(ids[0]));
  });
});

describe('ReadOnlyScope: nothing inside can reach a controller', () => {
  it('disables native controls and stops the events of custom ones', () => {
    const hits: string[] = [];
    render(
      <ReadOnlyScope who="B">
        <button type="button" onClick={() => hits.push('button')}>native</button>
        <input aria-label="n" onChange={() => hits.push('input')} />
        <div role="button" tabIndex={0} onClick={() => hits.push('div')} onKeyDown={() => hits.push('key')}>custom</div>
      </ReadOnlyScope>,
    );
    expect(screen.getByRole('button', { name: 'native' }).matches(':disabled')).toBe(true);
    expect(screen.getByLabelText('n').matches(':disabled')).toBe(true);
    fireEvent.click(screen.getByText('native')); fireEvent.click(screen.getByText('custom'));
    fireEvent.keyDown(screen.getByText('custom'), { key: 'Enter' }); fireEvent.change(screen.getByLabelText('n'), { target: { value: '3' } });
    expect(hits).toEqual([]);
    expect(screen.getByText(/Read-only/).textContent).toContain('B');
    expect(document.querySelector('fieldset')!.hasAttribute('inert')).toBe(false);
  });

  it('inert is opt-in', () => {
    render(<ReadOnlyScope who="B" inert><button type="button">x</button></ReadOnlyScope>);
    expect(document.querySelector('fieldset')!.hasAttribute('inert')).toBe(true);
  });

  it('a real section (Input team) rendered read-only for B changes nothing, whatever is clicked', async () => {
    const Team = lazy(() => import('@/ui/sections/baseline/team-in'));
    const before = JSON.stringify(pf()), undo = appStore().getState().history.undo.length;
    render(<ProductViewProvider productId={ids[1]}><ReadOnlyScope who="B"><Suspense fallback={null}><Team /></Suspense></ReadOnlyScope></ProductViewProvider>);
    await screen.findByRole('heading', { level: 4, name: /Input team/ });
    expect(document.querySelector('h1')).toBeNull();
    for (const b of screen.getAllByRole('button')) fireEvent.click(b);
    for (const i of document.querySelectorAll('input')) fireEvent.change(i, { target: { value: '99' } });
    expect(JSON.stringify(pf())).toBe(before);
    expect(appStore().getState().history.undo).toHaveLength(undo);
    expect(screen.getByLabelText(/Total AS-IS team/).getAttribute('value') ?? (screen.getByLabelText(/Total AS-IS team/) as HTMLInputElement).value).toBe('10');
  });
});
