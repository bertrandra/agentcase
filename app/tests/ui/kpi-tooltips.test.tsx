// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { storySummary } from '@/domain/pdc/story';
import { velocityUpliftPct } from '@/domain/verifyB/velocityUplift';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../store/helpers';

beforeEach(() => { freshStore(); uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false }); });
afterEach(cleanup);

describe('top bar headline values', () => {
  it('every value carries an explanatory tooltip', () => {
    render(<App />);
    const items = [...screen.getByLabelText('Headline results').querySelectorAll('.ac-kpi')];
    expect(items.length).toBeGreaterThanOrEqual(6);
    for (const el of items) expect(el.getAttribute('title')?.length ?? 0, el.textContent ?? '').toBeGreaterThan(30);
  });
  it('the top bar no longer shows NPV', () => {
    render(<App />);
    expect(screen.queryByText('NPV')).toBeNull();
  });
  it('shows the velocity uplift of the horizon end, as the story does', () => {
    render(<App />);
    const want = velocityUpliftPct(makeCtx(appStore().getState().doc));
    expect(screen.getByText(/^Velocity Y\d+$/).parentElement!.querySelector('.ac-kpi-v')!.textContent).toBe(`${want >= 0 ? '+' : ''}${want}%`);
    expect(want).toBe(storySummary(makeCtx(appStore().getState().doc)).velocityPct);
  });
});
