// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../store/helpers';

beforeEach(() => { freshStore(); uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false }); });
afterEach(cleanup);

describe('top bar headline values', () => {
  it('every value carries an explanatory tooltip', () => {
    render(<App />);
    const items = [...screen.getByLabelText('Headline results').querySelectorAll('.ac-kpi')];
    expect(items.length).toBeGreaterThanOrEqual(7);
    for (const el of items) expect(el.getAttribute('title')?.length ?? 0, el.textContent ?? '').toBeGreaterThan(30);
  });
  it('NPV explains the discounting', () => {
    render(<App />);
    expect(screen.getByText('NPV').parentElement!.getAttribute('title')).toMatch(/discount/i);
  });
});
