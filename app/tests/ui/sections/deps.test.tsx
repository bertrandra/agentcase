// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '@/controllers/refshare';
import { COMMAND_REGISTRY } from '@/store/commands';
import { appStore } from '@/store/instance';
import Deps from '@/ui/sections/refshare/deps';
import { DATA, DRAWN, isReference, LAYERS, planFor, select } from '@/ui/sections/refshare/deps/model';
import { uiStore } from '@/ui/uiState';
import { freshStore } from '../../store/helpers';

/**
 * Section Dependencies shows the GENERATED graph (DEV-DEPS-ZONES). These tests replace the former assertions that compared the section with the legacy text
 * (`expectParity('deps', ...)`: 148 authored edges, "30 of 85 sections drive something") and the edge-editor tests (add / flip / remove, prune a ghost edge):
 * the authored registry is no longer displayed or edited here, by request, so those assertions describe a screen that no longer exists.
 */
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const nodes = (c: HTMLElement) => [...c.querySelectorAll<SVGGElement>('g[data-node]')];
const NAMES = ['🕸️ Dependency graph', '▦ Dependency matrix', '📝 Zones & figures', '🌳 Build order', '🧪 Tests impacted'];

describe('deps section (generated graph)', () => {
  it('has the five tabs, the generated-from-code note and counts that come from the JSON', () => {
    render(<Deps />);
    expect(screen.getByRole('heading', { level: 1, name: '🔗 Section Dependencies' })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(NAMES);
    expect(screen.getAllByText(/Generated at build time from the code/).length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(`${DATA.edges.length} edges`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`${DATA.counts.tests} test files`))).toBeTruthy();
    expect(screen.queryByText('Edit dependencies')).toBeNull();
  });
  it('the graph draws one node per zone and per calculating section; reference sections are one counted lane', () => {
    const { container } = render(<Deps />);
    const expected = DRAWN.length + DATA.sections.filter((s) => !isReference(s.id)).length;
    expect(nodes(container)).toHaveLength(expected);
    const refs = DATA.sections.filter((s) => isReference(s.id)).length;
    expect(screen.getByText(new RegExp(`${refs} reference sections have no calculation`))).toBeTruthy();
    expect(container.querySelectorAll('path[data-edge]').length).toBe(DATA.edges.filter((e) => nodes(container).some((n) => n.dataset.node === e[0]) && nodes(container).some((n) => n.dataset.node === e[1])).length);
  });
  it('selecting a node highlights its upstream and downstream and lists the impacted sections, zones and tests', () => {
    const { container } = render(<Deps />);
    fireEvent.click(screen.getByRole('button', { name: /^KPI Scorecard, section/ }));
    const hit = select('kpi');
    const lit = new Set(nodes(container).filter((n) => n.dataset.lit === '1').map((n) => n.dataset.node));
    expect([...hit.downstream, ...hit.upstream].filter((id) => nodes(container).some((n) => n.dataset.node === id)).every((id) => lit.has(id))).toBe(true);
    expect(lit.size).toBeLessThan(nodes(container).length);
    expect(hit.upstream.size).toBeGreaterThan(1);
    const panel = screen.getByRole('group', { name: 'Selected node' });
    const total = DATA.counts.tests, pl = planFor('kpi'), n = pl.tests.length;
    expect(panel.textContent).toContain(`${n} of ${total} test files`);
    expect(panel.textContent).toContain(`${hit.impacted.zones.filter((z) => z !== 'kpi').length} zones · ${hit.impacted.sections.filter((x) => x !== 'kpi').length} sections`);
    expect(within(panel).getByText(`Test files (${n})`)).toBeTruthy();
    const lit2 = [...container.querySelectorAll('path[data-edge]')].filter((p) => p.getAttribute('opacity') === '1');
    expect(lit2.length).toBeGreaterThan(0);
  });
  it('works from the keyboard: Enter selects, Escape clears, nodes are focusable buttons', () => {
    const { container } = render(<Deps />);
    const node = screen.getByRole('button', { name: /^Economics headline, calculation zone/ });
    expect(node.getAttribute('tabindex')).toBe('0');
    expect(node.getAttribute('aria-pressed')).toBe('false');
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(node.getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('group', { name: 'Selected node' })).getByRole('heading', { level: 3 }).textContent).toContain('Economics headline');
    fireEvent.keyDown(node, { key: 'Escape' });
    expect(node.getAttribute('aria-pressed')).toBe('false');
    expect(nodes(container).every((g) => g.dataset.lit === '1')).toBe(true);
  });
  it('a section node opens its section from the panel; a section link of the matrix navigates', () => {
    render(<Deps />);
    fireEvent.click(screen.getByRole('button', { name: /^📊 S-curve — adoption ramp, section/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Open this section' }));
    expect(uiStore.getState().activeSection).toBe('scurve');
    tab('▦ Dependency matrix');
    fireEvent.click(screen.getByRole('button', { name: '🎯 Phase scope' }));
    expect(uiStore.getState().activeSection).toBe('phase-scope');
  });
  it('the matrix has a row per zone and per calculating section and marks direct, write and indirect links', () => {
    const { container } = render(<Deps />);
    tab('▦ Dependency matrix');
    const rows = container.querySelectorAll('tr[data-row]');
    expect(rows).toHaveLength(DRAWN.length + DATA.sections.filter((s) => !isReference(s.id)).length);
    const count = (k: string) => container.querySelectorAll(`td[data-cell="${k}"]`).length;
    expect(count('direct')).toBeGreaterThanOrEqual(DATA.edges.filter((e) => e[2] === 'z').length);
    expect(count('write')).toBe(DATA.edges.filter((e) => e[2] === 'w' && !isReference(e[0])).length);
    expect(count('indirect')).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText(/show the \d+ reference sections/));
    expect(container.querySelectorAll('tr[data-row]')).toHaveLength(DRAWN.length + DATA.sections.length);
  });
  it('zones & figures: a card per zone, every figure with its single owner module', () => {
    const { container } = render(<Deps />);
    tab('📝 Zones & figures');
    expect(container.querySelectorAll('article[data-zone]')).toHaveLength(DRAWN.length + 2);
    for (const f of DATA.figures) expect(screen.getAllByText(f.owner).length).toBeGreaterThan(0);
    const net = screen.getByRole('table', { name: 'Figures owned by Economics headline' });
    expect(within(net).getByText('Net benefit')).toBeTruthy();
    expect(within(net).getAllByText('src/domain/economics/headline.ts').length).toBeGreaterThan(0);
  });
  it('build order: layers, the cycle report and the feedback links', () => {
    const { container } = render(<Deps />);
    tab('🌳 Build order');
    expect(container.querySelectorAll('[data-layer]').length).toBe(new Set(Object.values(LAYERS.layer)).size);
    expect(screen.getByText(/feedback links set aside/)).toBeTruthy();
    expect(container.querySelectorAll('li').length).toBe(LAYERS.feedback.length);
    expect(container.querySelector('[data-cycle]')).not.toBeNull();
  });
  it('tests tab: the selection, the saved count and the rule for a chosen zone or section', () => {
    render(<Deps />);
    tab('🧪 Tests impacted');
    const sel = screen.getByLabelText('Changed zone or section');
    fireEvent.change(sel, { target: { value: 'verification-verdict' } });
    const line = screen.getByTestId('deps-selection').textContent!;
    const m = /(\d+) of (\d+) test files would run \(saved (\d+)%\)/.exec(line);
    expect(m).not.toBeNull();
    expect(+m![2]!).toBe(DATA.counts.tests);
    expect(+m![3]!).toBe(Math.round(((+m![2]! - +m![1]!) / +m![2]!) * 100));
    fireEvent.change(sel, { target: { value: 'foundation' } });
    expect(screen.getByRole('heading', { name: 'The rule' })).toBeTruthy();
    expect(screen.getAllByText(/full suite/i).length).toBeGreaterThan(0);
  });
  it('the authored registry stays in the case, untouched and not displayed; its commands stay registered', () => {
    const before = JSON.stringify(appStore().getState().doc.SECTION_DEPS);
    expect(before.length).toBeGreaterThan(100);
    const { container } = render(<Deps />);
    for (const t of NAMES) { tab(t); }
    expect(JSON.stringify(appStore().getState().doc.SECTION_DEPS)).toBe(before);
    expect(container.textContent).not.toContain('Nature & impact');
    for (const type of ['deps.addEdge', 'deps.flipEdge', 'deps.removeEdge', 'deps.setDescription']) expect(COMMAND_REGISTRY.has(type), type).toBe(true);
  });
});
