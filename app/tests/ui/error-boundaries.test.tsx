// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ChartConfiguration } from 'chart.js';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPersona } from '@/controllers/persona';
import { APP_VERSION } from '@/domain/version';
import { App } from '@/ui/App';
import { ErrorBoundary } from '@/ui/errors/ErrorBoundary';
import { caughtErrors, clearErrors } from '@/ui/errors/errorLog';
import { AppFallback } from '@/ui/errors/fallbacks';
import { SECTION_COMPONENTS } from '@/ui/sections';
import { goSection, uiStore } from '@/ui/uiState';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { axeViolations } from '../helpers/axe';
import { LAZY } from '../helpers/portfolioUi';
import { loadCase } from '../helpers/pdc';

/** A test section that throws while `fail` is set; `risk` is replaced by it for this file only. */
let fail = true;
function Flaky() {
  if (fail) throw new Error('boom in render');
  return <div className="ac-section"><h1>Recovered section</h1></div>;
}
const original = SECTION_COMPONENTS.risk!;
SECTION_COMPONENTS.risk = () => Promise.resolve({ default: Flaky });
afterAll(() => { SECTION_COMPONENTS.risk = original; });

const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);   // React and the boundary log the caught errors
beforeEach(() => {
  uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, wiz: { active: false, pos: 0, visited: [] } });
  loadCase('golden'); clearErrors(); fail = true; quiet.mockClear();
});
afterEach(cleanup);

const fallback = () => screen.findByRole('heading', { name: 'This section failed to display' }, LAZY);

describe('section error boundary', () => {
  it('a throwing section shows the fallback in the work area; the menu, KPI bar and other sections keep working', async () => {
    render(<App />);
    act(() => { setPersona('advanced'); goSection('risk'); });
    await fallback();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Headline results' })).toBeTruthy();
    expect(caughtErrors()[0]).toMatchObject({ scope: 'section', where: 'risk', message: 'Error: boom in render' });
    expect(quiet).toHaveBeenCalled();   // reported to the console
    act(() => goSection('home'));
    expect(await screen.findByRole('heading', { level: 1 }, LAZY)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'This section failed to display' })).toBeNull();
  });
  it('"Try again" remounts the section', async () => {
    render(<App />);
    act(() => goSection('risk'));
    await fallback();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Recovered section' }, LAZY)).toBeTruthy();
  });
  it('navigating away and back resets the boundary', async () => {
    render(<App />);
    act(() => goSection('risk'));
    await fallback();
    act(() => goSection('home'));
    fail = false;
    act(() => goSection('risk'));
    expect(await screen.findByRole('heading', { name: 'Recovered section' }, LAZY)).toBeTruthy();
  });
  it('"Copy details" copies the message, the stack, the section id and the app version; the dock lists the error', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App />);
    act(() => goSection('risk'));
    await fallback();
    fireEvent.click(screen.getByRole('button', { name: 'Copy details' }));
    const text = String((writeText.mock.calls[0] as unknown[])[0]);
    for (const s of ['boom in render', 'section (risk)', `AgentCase ${APP_VERSION}`, 'Stack:', 'Flaky']) expect(text).toContain(s);
    expect(await screen.findByText('Details copied.')).toBeTruthy();
    const dock = within(screen.getByRole('contentinfo'));
    fireEvent.click(dock.getByRole('button', { name: /History \(\d+\) · 1 display error/ }));
    expect(dock.getByRole('list', { name: 'Display errors in this session' }).textContent).toContain('Section “risk”: Error: boom in render');
  });
  it('the fallback has no axe violation', async () => {
    render(<App />);
    act(() => goSection('risk'));
    await fallback();
    expect(await axeViolations(screen.getByRole('main'), { region: false })).toEqual([]);
  });
});

describe('chart error boundary', () => {
  const broken = { type: 'bar', get data(): never { throw new Error('bad chart data'); } } as unknown as ChartConfiguration;
  it('a throwing chart shows a note in its place; the rest of the section renders', async () => {
    render(<div className="ac-section"><h1>Section</h1><p>Figure 42</p><ChartPanel config={broken} label="Savings" height={120} /><ChartPanel config={{ type: 'bar', data: { labels: ['a'], datasets: [{ label: 's', data: [1] }] } }} label="Fine" /></div>);
    expect(screen.getByRole('note').textContent).toContain('The chart “Savings” could not be drawn');
    expect(screen.getByText('Figure 42')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Fine' })).toBeTruthy();
    expect(caughtErrors()[0]).toMatchObject({ scope: 'chart', where: 'Savings' });
    expect(await axeViolations(document.body, { region: false })).toEqual([]);
  });
});

describe('app error boundary', () => {
  function Crash(): never { throw new Error('shell crash'); }
  it('a crash of the whole shell shows a minimal page with Reload and Copy details, and saves the case now', async () => {
    const onShown = vi.fn();
    render(<ErrorBoundary scope="app" where="shell" fallback={(e) => <AppFallback error={e} onShown={onShown} />}><Crash /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'AgentCase hit an unexpected error' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy details' })).toBeTruthy();
    expect(screen.getByRole('main').textContent).toContain('autosaved');
    expect(onShown).toHaveBeenCalled();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});
