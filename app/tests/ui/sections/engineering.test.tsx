// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/factory/engineering';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
type R = { id: string; [x: string]: unknown };
const list = (k: string) => (appStore().getState().doc as Record<string, unknown>)[k] as R[];
const ip = () => (appStore().getState().doc as unknown as { INTEGRATED_PRODUCT: { name: string; buildArtifactIds: string[] } }).INTEGRATED_PRODUCT;
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });
const add = (label: string) => fireEvent.click(screen.getByText(label));

describe('engineering section (Commit → Build → Build Artifact → Quality Gate → Integrated Product)', () => {
  it.each([...PARITY_FIXTURES, ...['fm-demo']])('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'engineering');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('a commit implements a task picked from the 53 + 370 artefacts (the list only opens on demand)', () => {
    loadFixture('golden');
    const { container } = render(<Section />);
    add('+ Add commit');
    expect(list('COMMITS')[0]).toMatchObject({ id: 'commit-1', taskId: null, message: '' });
    const pick = screen.getByLabelText('Task (implements) of commit-1') as HTMLSelectElement;
    expect(pick.options.length).toBe(1);   // closed: just "(pick a task)"
    fireEvent.focus(pick);
    expect((screen.getByLabelText('Task (implements) of commit-1') as HTMLSelectElement).options.length).toBe(1 + 53 + 370);
    fireEvent.change(screen.getByLabelText('Task (implements) of commit-1'), { target: { value: 'reg:R001' } });
    expect(list('COMMITS')[0]!.taskId).toBe('reg:R001');
    fireEvent.change(screen.getByLabelText('Message of commit-1'), { target: { value: 'Wire upload endpoint' } });
    fireEvent.change(screen.getByLabelText('Author of commit-1'), { target: { value: 'A. Kim' } });
    expect(list('COMMITS')[0]).toMatchObject({ message: 'Wire upload endpoint', author: 'A. Kim' });
    expect(container.querySelectorAll('option').length).toBeGreaterThan(400);
    undo(2);
    expect(list('COMMITS')[0]!.taskId).toBe('reg:R001');   // the task pick stays: undo reverted the author, then the message
    expect(list('COMMITS')[0]!.message).toBe('');
  });
  it('builds produce artefacts, gates clear them, and the integrated product is composed of the passing ones', () => {
    loadFixture('golden');
    render(<Section />);
    add('+ Add build'); add('+ Add build artifact'); add('+ Add quality gate');
    expect(list('BUILD_ARTIFACTS')[0]).toMatchObject({ buildId: 'build-1', type: 'Package', version: '0.1.0' });
    expect(list('QUALITY_GATES')[0]).toMatchObject({ buildArtifactId: 'bart-1', result: 'Pending' });
    fireEvent.change(screen.getByLabelText('Status of New build'), { target: { value: 'Failed' } });
    expect(list('BUILDS')[0]!.status).toBe('Failed');
    fireEvent.change(screen.getByLabelText('Result of New quality gate'), { target: { value: 'Pass' } });
    expect(screen.getByText(/Composed of 0 of 1 build artifact/)).toBeTruthy();
    fireEvent.click(screen.getByText('↻ Auto-include all Pass gates'));
    expect(ip().buildArtifactIds).toEqual(['bart-1']);
    expect(screen.getByText(/Composed of 1 of 1 build artifact/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Include New build artifact'));
    expect(ip().buildArtifactIds).toEqual([]);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Claims platform' } });
    expect(ip().name).toBe('Claims platform');
    const row = screen.getByLabelText('Name of New build artifact').closest('tr')!;
    fireEvent.click(within(row).getByText('🗑')); fireEvent.click(within(row).getByText('✓ Confirm'));
    expect(list('QUALITY_GATES')[0]!.buildArtifactId).toBeNull();   // orphaned
    expect(ip().buildArtifactIds).toEqual([]);
  });
  it('a generated dataset shows only the first 100 rows of each long table (the KPIs still read all)', () => {
    loadFixture('fm-generated');
    render(<Section />);
    expect(list('COMMITS').length).toBeGreaterThan(100);
    expect(screen.getAllByLabelText(/^Message of cm-/)).toHaveLength(100);
    expect(screen.getAllByText(/^Showing the first 100 of/).length).toBeGreaterThanOrEqual(1);
  });
});
