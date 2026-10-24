// @vitest-environment jsdom
import { log, resetRenders, topRenders, totalRenders } from '../helpers/renderCount';   // first: installs the DevTools hook before react-dom loads
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { setCustomerName } from '@/controllers/frame';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import { loadFixture } from '../helpers/fixtures';
import { threeProducts } from '../helpers/portfolioStore';
import { LAZY, mountApp } from '../helpers/portfolioUi';
import { view } from '../helpers/vueAgg';

/**
 * Re-render cost of ONE edit (lot 5a, item 3): how many components render in the whole app (top bar, KPI bar, sidebar, dock and the open section) for a
 * single case edit, counted with the DevTools commit hook (helpers/renderCount). Two edits per section: one that changes the figures (`workdays`, or a
 * % auto on Scope) and one that changes none (the customer name). The budgets are the counts measured after the selector hooks with a little headroom
 * (docs/ARCHITECTURE.md §6 has the before / after table).
 */
type Edit = 'figure' | 'name';
/** `before`: the count measured before lot 5a (no selector hooks), for the record; `budget`: the ceiling enforced now. */
interface Run { key: string; section: string; title: RegExp; portfolio?: boolean; edit: Edit; budget: number; before: number }
const figure = (section: string) => (section === 'scope-sel' ? () => setAgentSup('A017', 47) : () => setInput('workdays', 211));
const RUNS: Run[] = [
  { key: 'home · figure', section: 'home', title: /Welcome/i, edit: 'figure', budget: 10, before: 24 },
  { key: 'params · figure', section: 'params', title: /Parameters|Glass/i, edit: 'figure', budget: 45, before: 53 },
  { key: 'params · name', section: 'params', title: /Parameters|Glass/i, edit: 'name', budget: 45, before: 53 },
  { key: 'scope-sel · figure', section: 'scope-sel', title: /Scope/i, edit: 'figure', budget: 57, before: 65 },
  { key: 'financial · figure', section: 'financial', title: /Financial/i, edit: 'figure', budget: 105, before: 108 },
  { key: 'financial · name', section: 'financial', title: /Financial/i, edit: 'name', budget: 10, before: 108 },
  { key: 'scenarios · figure', section: 'scenarios', title: /Scenario/i, edit: 'figure', budget: 48, before: 45 },
  { key: 'scenarios · name', section: 'scenarios', title: /Scenario/i, edit: 'name', budget: 10, before: 45 },
  { key: 'run-sizing · figure', section: 'run-sizing', title: /sizing/i, edit: 'figure', budget: 44, before: 67 },
  { key: 'portfolio financial · figure', section: 'financial', title: /Financial/i, portfolio: true, edit: 'figure', budget: 42, before: 51 },
  { key: 'portfolio financial · name', section: 'financial', title: /Financial/i, portfolio: true, edit: 'name', budget: 15, before: 51 },
  { key: 'portfolio scenarios · name', section: 'scenarios', title: /Scenario/i, portfolio: true, edit: 'name', budget: 29, before: 36 },
];
const measured: Record<string, { renders: number; commits: number; top: string }> = {};
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];   // jsdom: no 2D canvas
afterEach(cleanup);

describe('renders on a single edit', () => {
  it.each(RUNS)('$key', async (r) => {
    if (r.portfolio) threeProducts(); else loadFixture('golden');
    mountApp(r.section);
    if (r.portfolio) view('portfolio');
    await screen.findByRole('heading', { level: 1, name: r.title }, LAZY);
    const before = appStore().getState().portfolio;
    resetRenders();
    act(r.edit === 'name' ? () => setCustomerName('Acme') : figure(r.section));
    expect(appStore().getState().portfolio).not.toBe(before);   // the edit did change the case
    measured[r.key] = { renders: totalRenders(), commits: log.commits, top: topRenders(8).map(([n, k]) => `${n}×${k}`).join(' ') };
    expect(totalRenders(), JSON.stringify(measured[r.key])).toBeLessThanOrEqual(r.budget);
  }, 60000);
  it('report', () => { console.log(`RENDERS ${JSON.stringify(measured)}`); });
});
