// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChartConfiguration } from 'chart.js';
import { contrast, textColor } from '@/ui/colorText';
import { DEFAULT_THEME } from '@/domain/theme/resolve';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { chartText } from '@/ui/widgets/chartData';
import { NumField, TextField, ChoiceField, ConfirmButton } from '@/ui/widgets/CommitField';
import { DataTable } from '@/ui/widgets/DataTable';
import { CheckInput, NumberInput, RangeInput, SelectInput } from '@/ui/widgets/fields';
import { TabPanel, TabStrip } from '@/ui/widgets/TabStrip';
import { Tabs } from '@/ui/widgets/Tabs';
import { freshStore } from '../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('Tabs / TabStrip — WAI-ARIA tabs pattern', () => {
  const tabs = [{ id: 'a', label: 'Alpha', render: () => <p>panel a</p> }, { id: 'b', label: 'Beta', render: () => <p>panel b</p> }, { id: 'c', label: 'Gamma', render: () => <p>panel c</p> }];
  it('a named tablist, tabs wired to one labelled tabpanel, roving tabindex', () => {
    render(<Tabs tabs={tabs} label="Views" />);
    expect(screen.getByRole('tablist', { name: 'Views' })).toBeTruthy();
    const [a, b] = screen.getAllByRole('tab') as HTMLButtonElement[];
    expect(a!.getAttribute('aria-selected')).toBe('true'); expect(a!.tabIndex).toBe(0); expect(b!.tabIndex).toBe(-1);
    const panel = screen.getByRole('tabpanel', { name: 'Alpha' });
    expect(a!.getAttribute('aria-controls')).toBe(panel.id);
    expect(within(panel).getByText('panel a')).toBeTruthy();
  });
  it('arrow keys move and select, wrapping; Home / End jump', () => {
    render(<Tabs tabs={tabs} label="Views" />);
    const list = screen.getByRole('tablist');
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel', { name: 'Beta' })).toBeTruthy();
    fireEvent.keyDown(list, { key: 'End' });
    expect(screen.getByRole('tabpanel', { name: 'Gamma' })).toBeTruthy();
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel', { name: 'Alpha' })).toBeTruthy();
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(screen.getByRole('tabpanel', { name: 'Gamma' })).toBeTruthy();
    fireEvent.keyDown(list, { key: 'Home' });
    expect(screen.getByRole('tabpanel', { name: 'Alpha' })).toBeTruthy();
  });
  it('a strip whose panel lives elsewhere in the section still controls it', () => {
    const { rerender } = render(<><TabStrip base="x" label="Strip" value="p" onChange={() => undefined} tabs={[{ id: 'p', label: 'P' }, { id: 'q', label: 'Q' }]} /><TabPanel base="x" current="p">body</TabPanel></>);
    expect(screen.getByRole('tab', { name: 'P' }).getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel', { name: 'P' }).id);
    rerender(<><TabStrip base="x" label="Strip" value="q" onChange={() => undefined} tabs={[{ id: 'p', label: 'P' }, { id: 'q', label: 'Q' }]} /><TabPanel base="x" current="q">body</TabPanel></>);
    expect(screen.getByRole('tabpanel', { name: 'Q' })).toBeTruthy();
  });
});

describe('form widgets — every control has an accessible name', () => {
  it('Field-based inputs are found by their label', () => {
    render(<>
      <NumberInput id="n1" label="Team size" /><RangeInput id="r1" label="Share" /><SelectInput id="s1" label="Region" options={[{ value: 'a', label: 'A' }]} />
      <CheckInput id="c1" label="Include run cost" /><NumField label="Rate" value={1} onCommit={() => undefined} /><TextField label="Name" value="" onChange={() => undefined} />
      <ChoiceField label="Mode" value="a" options={[{ value: 'a', label: 'A' }]} onChange={() => undefined} />
    </>);
    for (const name of ['Team size', /^Share/, 'Region', 'Include run cost', 'Rate', 'Name', 'Mode']) expect(screen.getByLabelText(name)).toBeTruthy();
  });
  it('a destructive action names its confirmation group', () => {
    render(<ConfirmButton label="Delete row" onConfirm={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete row' }));
    expect(screen.getByRole('group', { name: 'Confirm: Delete row' })).toBeTruthy();
  });
});

describe('DataTable', () => {
  const rows = [{ k: 'a', v: 1 }];
  it('column headers carry scope, a header-less column gets a hidden name, the scroller is focusable', () => {
    const { container } = render(<DataTable rows={rows} rowKey={(r) => r.k} caption="Figures" columns={[{ key: 'k', header: '', title: 'Key', render: (r) => r.k }, { key: 'v', header: 'Value', render: (r) => r.v }]} />);
    expect(screen.getByRole('table', { name: 'Figures' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Key' }).getAttribute('scope')).toBe('col');
    expect(screen.getByRole('columnheader', { name: 'Value' }).getAttribute('scope')).toBe('col');
    expect((container.querySelector('.ac-table-wrap') as HTMLElement).tabIndex).toBe(0);
  });
});

describe('ChartPanel', () => {
  const config = { type: 'line', data: { labels: ['Y1', 'Y2'], datasets: [{ label: 'Savings', data: [1.5, 2] }, { label: 'Cost', data: [3, 4] }] } } as ChartConfiguration;
  it('the canvas is a named image and the plotted data is available as text', () => {
    render(<ChartPanel config={config} label="Savings vs cost" />);
    expect(screen.getByRole('img', { name: 'Savings vs cost' })).toBeTruthy();
    const data = screen.getByRole('group', { name: 'Savings vs cost — data' });
    expect(data.textContent).toContain('Savings: Y1 1.50; Y2 2');
    expect(data.textContent).toContain('Cost: Y1 3; Y2 4');
  });
  it('chartText handles points, pairs and long series', () => {
    expect(chartText({ type: 'scatter', data: { datasets: [{ label: 'P', data: [{ x: 1, y: 2 }] }] } } as ChartConfiguration)).toEqual(['P: 1, 2']);
    expect(chartText({ type: 'bar', data: { labels: ['a'], datasets: [{ data: [[1, 3]] }] } } as unknown as ChartConfiguration)).toEqual(['Series 1: a 1 to 3']);
    const long = chartText({ type: 'line', data: { datasets: [{ label: 'L', data: Array.from({ length: 100 }, (_, i) => i) }] } } as ChartConfiguration)[0]!;
    expect(long.endsWith('; …')).toBe(true);
    expect(chartText({ type: 'line', data: { datasets: [] } } as unknown as ChartConfiguration)).toEqual([]);
  });
});

describe('textColor — data colours used as text reach 4.5:1', () => {
  it('keeps a dark enough colour, darkens a pale one while keeping its hue family, ignores non-hex', () => {
    expect(textColor('#0058ab', DEFAULT_THEME.tok)).toBe('#0058ab');
    for (const c of ['#0e8f8f', '#3b9e4f', '#9a8a1e', '#c08a00', '#c25e00', '#7a7a70', '#2e9e5b', '#b5651d']) {
      const out = textColor(c, DEFAULT_THEME.tok);
      expect(out).not.toBe(c);
      expect(contrast(out, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
    expect(textColor('rgb(1,2,3)', DEFAULT_THEME.tok)).toBe('rgb(1,2,3)');
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 0);
  });
});

