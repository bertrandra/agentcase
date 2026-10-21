// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { togglePhase } from '@/controllers/scope';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/factory/factory-model';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
const list = (k: string) => ((appStore().getState().doc as Record<string, unknown>)[k] as { id: string; [x: string]: unknown }[]);
const undo = (n = 1) => act(() => { for (let i = 0; i < n; i++) appStore().undo(); });
const confirm = (name: string) => { fireEvent.click(screen.getByText(name)); fireEvent.click(screen.getByText('✓ Confirm')); };

describe('factory-model section (Business + Delivery domains and the weekly generator)', () => {
  it.each([...PARITY_FIXTURES, ...['fm-demo', 'fm-generated', 'fm-generated-tuned']])('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'factory-model');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('the preflight reads the case: 157 weeks, 3 phases, 10 artefacts; dropping a phase from the scope follows', () => {
    loadFixture('golden');
    const { container } = render(<Section />);
    const text = () => renderedText(container).replace(/\s+/g, ' ');
    expect(text()).toMatch(/2026-09-01 → 2029-08-28 \( ?157 weeks\)/);
    expect(text()).toMatch(/3 phase\(s\) · 10 artefact\(s\) in scope/);
    act(() => { togglePhase('V3', false); });
    expect(text()).toMatch(/2 phase\(s\)/);
  });
  it('Portfolio, Epics, Features: add, rename, link, delete orphans the children; every step is undoable', () => {
    loadFixture('golden');
    render(<Section />);
    fireEvent.click(screen.getByText('+ Add portfolio item'));
    expect(list('PORTFOLIO_ITEMS')).toEqual([{ id: 'portfolio-1', name: 'New portfolio item' }]);
    fireEvent.change(screen.getByLabelText('Name of New portfolio item'), { target: { value: 'Core' } });
    expect(list('PORTFOLIO_ITEMS')[0]!.name).toBe('Core');
    fireEvent.click(screen.getByText('+ Add epic'));
    expect(list('EPICS')[0]).toMatchObject({ id: 'epic-1', portfolioId: 'portfolio-1' });
    fireEvent.click(screen.getByText('+ Add feature'));
    expect(list('FEATURES')[0]).toMatchObject({ id: 'feature-1', epicId: 'epic-1' });
    fireEvent.click(screen.getByLabelText('Link New feature to phase V3'));
    expect((list('fmPhaseFeatures').find((p) => p.id === 'V3')!.featureIds as string[])).toEqual(['feature-1']);
    const row = screen.getByLabelText('Name of New epic').closest('tr')!;
    fireEvent.click(within(row).getByText('🗑')); fireEvent.click(within(row).getByText('✓ Confirm'));
    expect(list('EPICS')).toHaveLength(0);
    expect(list('FEATURES')[0]!.epicId).toBeNull();   // orphaned, not deleted
    undo();
    expect(list('FEATURES')[0]!.epicId).toBe('epic-1');
  });
  it('Stories link to existing artefacts; deleting a story unlinks them', () => {
    loadFixture('golden');
    render(<Section />);
    fireEvent.click(screen.getByText('+ Add story'));
    fireEvent.click(screen.getByText(/▶ 0 linked/));
    fireEvent.click(screen.getByLabelText('A017 in story story-1'));
    fireEvent.click(screen.getByLabelText('R001 in story story-1'));
    expect(list('fmArtefactTags').find((t) => t.id === 'A017')!.storyId).toBe('story-1');
    expect(list('fmRegArtefactTags').find((t) => t.id === 'R001')!.storyId).toBe('story-1');
    expect(screen.getByText(/▼ 2 linked/)).toBeTruthy();
    confirm('🗑');
    expect(list('STORIES')).toHaveLength(0);
    expect(list('fmArtefactTags').find((t) => t.id === 'A017')!.storyId).toBeNull();
  });
  it('the vision is a case edit', () => {
    loadFixture('golden');
    render(<Section />);
    fireEvent.change(screen.getByLabelText('Vision'), { target: { value: 'Cut cycle time in half' } });
    expect((appStore().getState().doc as unknown as { VISION: { statement: string } }).VISION.statement).toBe('Cut cycle time in half');
    undo();
    expect((appStore().getState().doc as unknown as { VISION: { statement: string } }).VISION.statement).toBe('');
  });
  it('demo dataset and delete-all (both ask twice); neither moves a euro of the financial case', () => {
    loadFixture('golden');
    const money = computeCase(appStore().getState().doc).model.yearSav;
    render(<Section />);
    confirm('📦 Load demo dataset');
    expect(list('STORIES')).toHaveLength(12);
    expect(list('COMMITS')).toHaveLength(18);
    expect(screen.getByLabelText('Name of Rules+LLM triage engine')).toBeTruthy();
    expect(computeCase(appStore().getState().doc).model.yearSav).toEqual(money);
    confirm('🗑 Delete all Factory Model data');
    expect(list('STORIES')).toHaveLength(0);
    expect(list('ENVIRONMENTS')).toHaveLength(6);   // the seeded stages survive: never zero
    undo(2);
    expect(list('STORIES')).toHaveLength(0);
  });
  it('Generate data fills the model from the case (seeded, down-sampled); an existing dataset needs a second click; parameters are edits', () => {
    loadFixture('golden');
    const money = computeCase(appStore().getState().doc).model.yearSav;
    const { container } = render(<Section />);
    fireEvent.change(screen.getByLabelText('Density'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByText('🧬 Generate data'));
    expect(list('STORIES')).toHaveLength(5);
    expect(list('RELEASES').length).toBeGreaterThan(5);
    expect(list('COMMITS').length).toBeGreaterThan(100);
    expect(renderedText(container)).toMatch(/Simulated from this case/);
    expect(computeCase(appStore().getState().doc).model.yearSav).toEqual(money);
    const first = list('COMMITS').length;
    fireEvent.click(screen.getByText('🧬 Generate data'));
    expect(screen.getByText(/This will clear the existing factory data/)).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(list('COMMITS')).toHaveLength(first);
    fireEvent.click(screen.getByText('🧬 Generate data'));
    fireEvent.click(screen.getByText('Clear and generate'));
    expect(list('COMMITS')).toHaveLength(first);   // same seed, same dataset
    fireEvent.click(screen.getByText('Reset parameters'));
    expect((appStore().getState().doc as unknown as { FG_PARAMS: { density: number } }).FG_PARAMS.density).toBe(1);
  }, 30000);
});
