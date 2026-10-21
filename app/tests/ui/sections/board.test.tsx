// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveSections, type NavSection, type SectionRow } from '@/domain/nav/layout';
import { newDashboard, type DynSection } from '@/domain/pdc/board';
import { VARIABLES } from '@/domain/pdc/variables';
import { appStore } from '@/store/instance';
import Board from '@/ui/sections/configure/board';
import { SECTIONS, GROUPS } from '@/ui/zones/registry';
import { legacyText } from '../../helpers/economics';
import { missingNumbers, renderedText } from '../../helpers/parity';
import { loadCase, pdc, PDC_FIXTURES } from '../../helpers/pdc';

afterEach(cleanup);
const FOUR = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];
const docSections = () => appStore().getState().doc.dynamicSections as DynSection[];
const generate = (...groups: string[]) => { groups.forEach((g) => fireEvent.click(screen.getByLabelText(new RegExp(GROUPS.find((x) => x.id === g)!.label)))); fireEvent.click(screen.getByText('➕ Generate dashboard')); };
type Slots = (string | null)[][];
type Dash = { one: DynSection & { nCards: number; slots: Slots }; two: DynSection & { nCards: number; slots: Slots }; all: DynSection & { nCards: number; slots: Slots }; max: number };
const slotsOf = (d: DynSection): Slots => d.cards.map((c) => [c.CARD_NAME_VALUE, c.CARD_SOURCE_SECTION, c.CARD_TARGET_SECTION, c.CARD_IMPACT_VAR, c.CARD_KEY1_VAR, c.CARD_KEY2_VAR]);

describe('board section', () => {
  it.each(FOUR)('shows every figure the legacy section showed (%s)', (id) => {
    loadCase(id);
    const { container } = render(<Board />), legacy = legacyText(id, 'board');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
    expect(container.textContent).toContain('No dynamic sections yet.');
  });
  it.each(PDC_FIXTURES)('generates the same dashboard record and persona cascade as the legacy (%s)', (id) => {
    loadCase(id);
    const l = pdc<Dash>('pdc_dash', id), sections = resolveSections(SECTIONS as NavSection[], appStore().getState().doc.sectionGroups as SectionRow[] | undefined, undefined).map((s) => ({ id: s.id, group: s.group, label: s.label })), groups = GROUPS;
    for (const [k, ids, all] of [['one', ['tune'], false], ['two', ['tune', 'verify'], false], ['all', [], true]] as const) {
      const got = newDashboard({ groupIds: [...ids], allGroups: all, existing: [], groups, sections, maxOrder: l.max })!, want = l[k];
      expect({ ...got, cards: undefined }).toEqual({ ...want, cards: undefined, nCards: undefined, slots: undefined });
      expect(got.cards.slice(0, 2)).toEqual(want.cards.slice(0, 2));
      expect(got.cards).toHaveLength(want.nCards);
      expect(slotsOf(got)).toEqual(want.slots);   // every card: name, source, target and the three bound variables
    }
  });
  it('generating a dashboard adds it to the document and every persona list; it can be undone', () => {
    loadCase('golden');
    const { container } = render(<Board />);
    generate('tune', 'verify');
    expect(container.textContent).toContain('🗂️ Dashboard — Tune + Verify');
    expect(docSections()).toHaveLength(1);
    expect((appStore().getState().doc.PERSONA_SECTIONS as Record<string, string[]>).admin).toContain('dyn-groups-1');
    act(() => appStore().undo());
    expect(docSections()).toHaveLength(0);
    expect((appStore().getState().doc.PERSONA_SECTIONS as Record<string, string[]>).admin).not.toContain('dyn-groups-1');
  });
  it('asks for a group before generating', () => {
    loadCase('golden');
    render(<Board />);
    fireEvent.click(screen.getByText('➕ Generate dashboard'));
    expect(screen.getByRole('alert').textContent).toMatch(/Pick at least one group/);
    expect(docSections()).toHaveLength(0);
  });
  it('Open shows the cards with live values that follow the case', () => {
    loadCase('golden');
    const { container } = render(<Board />);
    generate('tune');
    fireEvent.click(screen.getByText('Open'));
    const preview = within(screen.getByLabelText(/Preview of/));
    expect(preview.getByText('Headlines · Savings')).toBeTruthy();
    const npv = VARIABLES.find((v) => v.id === 'npv8')!;
    expect(container.textContent).toContain('€');
    expect(npv).toBeTruthy();
    expect(preview.getAllByText(/^€[\d,-]+K$/).length).toBeGreaterThan(0);
  });
  it('Configure rebinds a card slot; the card shows the new variable', () => {
    loadCase('golden');
    render(<Board />);
    generate('tune');
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('⚙️ Configure'));
    const headline = screen.getByLabelText('Headline of card-dyn-groups-1-1') as HTMLSelectElement;
    expect(headline.value).toBe('netSavY3');
    fireEvent.mouseDown(headline);
    fireEvent.change(headline, { target: { value: 'artefactsInScope' } });
    expect(docSections()[0]!.cards[0]!.CARD_IMPACT_VAR).toBe('artefactsInScope');
    expect(within(screen.getByLabelText(/Preview of/)).getByText('10')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Name of card-dyn-groups-1-1'), { target: { value: 'Mine' } });
    expect(within(screen.getByLabelText(/Preview of/)).getByText('Mine')).toBeTruthy();
    act(() => { appStore().undo(); appStore().undo(); });
    expect(docSections()[0]!.cards[0]!.CARD_IMPACT_VAR).toBe('netSavY3');
  });
  it('rename, move to another group and remove with confirmation', () => {
    loadCase('golden');
    const { container } = render(<Board />);
    generate('tune');
    fireEvent.click(screen.getByText('✎ Rename'));
    fireEvent.change(screen.getByLabelText('New name'), { target: { value: 'Steering' } });
    fireEvent.click(screen.getByText('✓ Save'));
    expect(container.textContent).toContain('🗂️ Steering');
    fireEvent.change(screen.getByLabelText('Group of Steering'), { target: { value: 'verify' } });
    expect(docSections()[0]!.menuGroup).toBe('verify');
    fireEvent.click(screen.getByText('✕ Remove'));
    fireEvent.click(screen.getByText('✓ Confirm'));
    expect(container.textContent).toContain('No dynamic sections yet.');
    expect(docSections()).toHaveLength(0);
  });
  it('the variable catalog lists every variable with its live value', () => {
    loadCase('golden');
    const { container } = render(<Board />);
    fireEvent.click(screen.getByText('📚 Variable catalog'));
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(VARIABLES.length);
    expect(container.textContent).toContain('Net savings, end-year');
    expect(container.textContent).toContain('€892K');
  });
});
