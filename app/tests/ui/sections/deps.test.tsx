// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '@/store/instance';
import Deps from '@/ui/sections/refshare/deps';
import { uiStore } from '@/ui/uiState';
import { expectParity } from '../../helpers/sectionParity';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const edges = () => (appStore().getState().doc.SECTION_DEPS as Record<string, Record<string, string>>);
const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));

describe('deps section', () => {
  it('shows every figure and heading the legacy section showed (4 fixtures)', () => {
    // legacy: 79 sections, 23 outside the graph; the catalogue now also holds the 6 Portefeuille sections (85 / 29)
    expectParity('deps', Deps, { ignore: [79, 23], headings: ['Section Dependencies', '● strong (calculation input)', '○ soft (annotation / signal)', 'Row impacts column · 148 edges · 30 of 85 sections drive something', 'Dependency graph', 'Dependency matrix', 'Descriptions & impact', 'Build order', 'Edit dependencies', '1 · FRAME', '10 · PRESENT', 'Deliberately outside the graph (29 sections)', 'Input team', 'Rate Card'] });
  });
  it('the graph isolates the links of a hovered node and opens a section on click', () => {
    const { container } = render(<Deps />);
    const node = screen.getByRole('button', { name: '🎯 Phase scope' });
    fireEvent.mouseEnter(node);
    const lit = [...container.querySelectorAll('path[data-edge]')].filter((p) => p.getAttribute('opacity') === '1');
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.every((p) => p.getAttribute('data-edge')!.includes('phase-scope'))).toBe(true);
    fireEvent.click(node);
    expect(uiStore.getState().activeSection).toBe('phase-scope');
  });
  it('the matrix lists participating sections in build order with strong and soft cells', () => {
    render(<Deps />);
    tab('▦ Dependency matrix');
    expect(screen.getByText(/30 participating sections|participating sections/)).toBeTruthy();
    expect(screen.getAllByText('●').length + screen.getAllByText('○').length).toBeGreaterThanOrEqual(148);
    fireEvent.click(screen.getByLabelText(/show all 85 sections/));
    expect(screen.getByText(/all 85 sections; mostly empty/)).toBeTruthy();
  });
  it('descriptions and the build order are derived from the registry', () => {
    render(<Deps />);
    tab('📝 Descriptions & impact');
    expect(screen.getByText(/leaf|The in-scope artefact set drives per-phase automation/)).toBeTruthy();
    tab('🌳 Build order');
    expect(screen.getByText('Layer 0')).toBeTruthy();
    expect(screen.getAllByText(/feedback link/).length).toBeGreaterThan(0);
  });
  it('editing: add, flip, remove an edge and describe it → document → undo', () => {
    render(<Deps />);
    tab('✎ Edit dependencies');
    const before = JSON.stringify(edges());
    fireEvent.change(screen.getByLabelText('Add target for 🎯 Automation & Glass ceiling'), { target: { value: 'kpi' } });
    expect(edges().params?.kpi).toBe('S');
    fireEvent.click(screen.getByLabelText('Flip 🎯 Automation & Glass ceiling to KPI Scorecard'));
    expect(edges().params?.kpi).toBe('I');
    fireEvent.click(screen.getByLabelText('Remove 🎯 Automation & Glass ceiling to KPI Scorecard'));
    expect(edges().params?.kpi).toBeUndefined();
    expect(JSON.stringify(edges())).toBe(before);
    fireEvent.change(screen.getByLabelText('Nature and impact of 🎯 Automation & Glass ceiling'), { target: { value: 'New text' } });
    expect((appStore().getState().doc.SECTION_DEPS_DESC as Record<string, string>).params).toBe('New text');
    act(() => { appStore().undo(); appStore().undo(); appStore().undo(); appStore().undo(); });
    expect(JSON.stringify(edges())).toBe(before);
    expect(screen.getAllByText(/148 edges/).length).toBeGreaterThan(0);
  });
  it('other views follow an edit, and an edge to a deleted section is reported and prunable', () => {
    render(<Deps />);
    act(() => { appStore().dispatch({ type: 'test', label: 'seed ghost', payload: null, undoable: true, run: (d) => { (d.SECTION_DEPS as Record<string, Record<string, string>>).params!.ghost = 'S'; } }); });
    expect(screen.getByText(/point at deleted sections/)).toBeTruthy();
    fireEvent.click(within(screen.getByText(/point at deleted sections/).parentElement!).getByText('Prune them'));
    expect(edges().params?.ghost).toBeUndefined();
    expect(screen.queryByText(/point at deleted sections/)).toBeNull();
  });
});
