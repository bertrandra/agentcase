// @vitest-environment jsdom
import { log, resetRenders, topRenders, totalRenders } from '../helpers/renderCount';   // first: installs the DevTools hook before react-dom loads
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setAgentSup } from '@/controllers/artefacts';
import { setCustomerName } from '@/controllers/frame';
import { setInput } from '@/controllers/inputs';
import { updateProcessActivity } from '@/controllers/process';
import { setDisplayScope } from '@/controllers/displayScope';
import { setServiceSkills } from '@/controllers/services';
import { runPortfolioSimulation } from '@/controllers/stressPortfolio';
import { consolidate, corePortfolio, runStats } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { pfSimStore } from '@/store/portfolioSimulation';
import { loadFixture } from '../helpers/fixtures';
import { threeProducts } from '../helpers/portfolioStore';
import { LAZY, mountApp } from '../helpers/portfolioUi';
import { serviceThree } from '../helpers/services';
import { unitTreeThree } from '../helpers/unitScope';
import { view } from '../helpers/vueAgg';

/**
 * Re-render cost of ONE edit (lot 5a, item 3): how many components render in the whole app (top bar, KPI bar, sidebar, dock and the open section) for a
 * single case edit, counted with the DevTools commit hook (helpers/renderCount). Two edits per section: one that changes the figures (`workdays`, or a
 * % auto on Scope) and one that changes none (the customer name); the BPMN-era sections (Process, Programme, Plan, Organisation, Who does what,
 * Audit) add a third, a process edit (one activity's effort). The budgets are the counts measured after the selector hooks with a little headroom
 * (docs/ARCHITECTURE.md §6 has the before / after table).
 */
type Edit = 'figure' | 'name' | 'process';
/** `before`: the count measured before lot 5a (no selector hooks), for the record; `budget`: the ceiling enforced now. */
interface Run { key: string; section: string; title: RegExp; portfolio?: boolean; edit: Edit; budget: number; before: number }
const figure = (section: string) => (section === 'scope-sel' ? () => setAgentSup('A017', 47) : () => setInput('workdays', 211));
/** The BPMN-era sections: a figure, the customer name and one activity's effort, in that order; `before`: measured before their selective refresh. */
type Three = [number, number, number];
const bpmn = (section: string, title: RegExp, budget: Three, before: Three): Run[] => (['figure', 'name', 'process'] as const)
  .map((edit, i) => ({ key: `${section} · ${edit}`, section, title, edit, budget: budget[i]!, before: before[i]! }));
/** The process edit: one activity's effort (`process.updateActivity`). */
const effortOfOne = () => updateProcessActivity('A017', { effort: 7 });
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
  ...bpmn('process', /Process \(BPMN\)/, [18, 11, 31], [57, 56, 532]),
  ...bpmn('programme', /Programme/, [42, 10, 6], [111, 110, 105]),
  ...bpmn('gantt', /Plan/, [36, 18, 43], [78, 77, 72]),
  ...bpmn('organisation', /Organisation/, [12, 22, 6], [10, 20, 15]),
  ...bpmn('who-does-what', /Who does what/, [12, 23, 18], [10, 21, 16]),
  ...bpmn('audit', /Audit/, [12, 11, 18], [10, 9, 29]),
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
    act(r.edit === 'name' ? () => setCustomerName('Acme') : r.edit === 'process' ? effortOfOne : figure(r.section));
    expect(appStore().getState().portfolio).not.toBe(before);   // the edit did change the case
    measured[r.key] = { renders: totalRenders(), commits: log.commits, top: topRenders(8).map(([n, k]) => `${n}×${k}`).join(' ') };
    expect(totalRenders(), JSON.stringify(measured[r.key])).toBeLessThanOrEqual(r.budget);
  }, 60000);
  it('report', () => { console.log(`RENDERS ${JSON.stringify(measured)}`); });
});

/**
 * A unit scope switch (F-B81, phase B10b): view state only — the core portfolio and its consolidation keep their identity and no product engine is
 * built (the per-product memo); the renders are those of the new View (the headline bar, the banner and the section's aggregate). Budgets: measured
 * with a little headroom.
 */
const SWITCHES: { key: string; section: string; title: RegExp; from: () => void; to: { kind: 'unit'; id: string }; budget: number; run?: true }[] = [
  { key: 'portfolio → unit', section: 'financial', title: /Financial/i, from: () => view('portfolio'), to: { kind: 'unit', id: 'bu' }, budget: 55 },
  { key: 'unit → sub-unit', section: 'financial', title: /Financial/i, from: () => setDisplayScope({ kind: 'unit', id: 'bu' }), to: { kind: 'unit', id: 'd1' },
    budget: 55 },
  { key: 'unit → unit (plan)', section: 'gantt', title: /Plan/, from: () => setDisplayScope({ kind: 'unit', id: 'd1' }), to: { kind: 'unit', id: 'd3' },
    budget: 70 },
  // B10d: the unit's decision and distribution re-read from the run (never drawn again)
  { key: 'unit → unit (decision)', section: 'decision', title: /Decision Intelligence/, from: () => setDisplayScope({ kind: 'unit', id: 'bu' }),
    to: { kind: 'unit', id: 'd1' }, budget: 45, run: true },
  { key: 'portfolio → unit (Monte Carlo)', section: 'montecarlo', title: /Monte Carlo/, from: () => view('portfolio'), to: { kind: 'unit', id: 'bu' },
    budget: 60, run: true },
];
describe('renders on a unit scope switch', () => {
  it.each(SWITCHES)('$key', async (r) => {
    unitTreeThree(); pfSimStore.setState({ run: null, progress: null, params: null });
    if (r.run) await runPortfolioSimulation({ draws: 200, seed: 5 });
    const sim = pfSimStore.getState().run;
    mountApp(r.section); act(r.from);
    await screen.findByRole('heading', { level: 1, name: r.title }, LAZY);
    const core = corePortfolio(appStore().getState().portfolio), c = consolidate(core), builds = runStats.builds;
    resetRenders();
    act(() => { setDisplayScope(r.to); });
    await screen.findByRole('heading', { level: 1, name: r.title }, LAZY);
    measured[r.key] = { renders: totalRenders(), commits: log.commits, top: topRenders(8).map(([n, k]) => `${n}×${k}`).join(' ') };
    expect(corePortfolio(appStore().getState().portfolio)).toBe(core); expect(consolidate(core)).toBe(c);
    expect(runStats.builds).toBe(builds); expect(pfSimStore.getState().run).toBe(sim);   // switching scope recomputes no product, re-draws nothing
    expect(totalRenders(), JSON.stringify(measured[r.key])).toBeLessThanOrEqual(r.budget);
  }, 60000);
  it('report', () => { console.log(`SWITCH RENDERS ${JSON.stringify(Object.fromEntries(SWITCHES.map((r) => [r.key, measured[r.key]])))}`); });
});

/**
 * The Services tab of 🏢 Organisation (F-B82, phase B10c) on the three products served by one service: a figure, the customer name, an edit of the
 * service (its activity types: the effort split moves) and a switch of the View. Budgets: measured with a little headroom.
 */
const SERVICE_EDITS: { key: string; edit: () => void; budget: number }[] = [
  { key: 'services · figure', edit: () => setInput('workdays', 211), budget: 22 },
  { key: 'services · name', edit: () => setCustomerName('Acme'), budget: 23 },
  { key: 'services · service', edit: () => setServiceSkills('qa', ['Test/QA', 'Dev']), budget: 23 },
  { key: 'services · view', edit: () => setDisplayScope({ kind: 'portfolio' }), budget: 30 },
];
describe('renders on the Services tab', () => {
  it.each(SERVICE_EDITS)('$key', async (r) => {
    serviceThree(); mountApp('organisation');
    await screen.findByRole('heading', { level: 1, name: /Organisation/ }, LAZY);
    act(() => { fireEvent.click(screen.getByRole('tab', { name: 'Services' })); });
    const before = appStore().getState().portfolio;
    resetRenders();
    act(r.edit);
    expect(appStore().getState().portfolio).not.toBe(before);
    measured[r.key] = { renders: totalRenders(), commits: log.commits, top: topRenders(8).map(([n, k]) => `${n}×${k}`).join(' ') };
    expect(totalRenders(), JSON.stringify(measured[r.key])).toBeLessThanOrEqual(r.budget);
  }, 60000);
  it('report', () => { console.log(`SERVICES RENDERS ${JSON.stringify(Object.fromEntries(SERVICE_EDITS.map((r) => [r.key, measured[r.key]])))}`); });
});
