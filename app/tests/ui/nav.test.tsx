// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearPersonaSectionOrder, placeSections, setGroupOrders, setPersonaSectionOrder, setSectionNavStyle } from '@/controllers/navLayout';
import { addGroup, deleteGroup, renameGroup, removePersonaSection, setGroupColor, setGroupDescription, setPersonaCompactNav } from '@/controllers/pdcPersonas';
import { setPersona } from '@/controllers/persona';
import { addDashboard } from '@/controllers/pdcBoard';
import { newDashboard } from '@/domain/pdc/board';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { NavZone } from '@/ui/shell/NavZone';
import { openGroup, uiStore } from '@/ui/uiState';
import { APP_SECTIONS, SECTIONS } from '@/ui/zones/registry';
import { legacyNav, NAV_FIXTURES } from '../helpers/nav';
import { loadCase } from '../helpers/pdc';

beforeEach(() => { uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, wiz: { active: false, pos: 0, visited: [] } }); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;
/** The sections shown, minus the app sections (🎨 Brand & theme), which the legacy page compared against does not have. */
const APP = new Set(APP_SECTIONS.map((s) => s.id));
const ids = (nav: HTMLElement) => [...nav.querySelectorAll<HTMLElement>('[data-section]')].map((b) => b.dataset.section).filter((id) => !APP.has(id!));
const heads = (nav: HTMLElement) => [...nav.querySelectorAll('h2')].map((h) => h.querySelector('span')?.textContent);
const navEl = () => screen.getByRole('navigation', { name: 'Sections' });
const menu = () => { const b = screen.queryByRole('button', { name: 'Toggle the sidebar menu' }); if (b?.getAttribute('aria-pressed') === 'false') fireEvent.click(b); };

describe('the sidebar follows the document', () => {
  it.each(NAV_FIXTURES)('renders the legacy groups and sections, in order, for every persona (%s)', (id) => {
    loadCase(id);
    render(<NavZone />);
    for (const [persona, want] of Object.entries(legacyNav(id).personas)) {
      act(() => setPersona(persona));
      const groups = [...navEl().querySelectorAll<HTMLElement>('section[data-group]')].map((g) => ({ group: g.dataset.group, sections: ids(g) })).filter((g) => g.sections.length);
      expect(groups, `${id} / ${persona}`).toEqual(want.groups);
    }
  });
  it('a group added in Persona management appears with its sections; deleting it removes the group', () => {
    loadCase('golden');
    render(<NavZone />);
    act(() => addGroup('Compliance'));
    expect(heads(navEl())).not.toContain('Compliance');   // an empty group is absent (legacy)
    act(() => placeSections('Move risk', [{ id: 'risk', group: 'compliance', groupSeq: 10 }]));
    expect(heads(navEl()).at(-1)).toBe('Compliance');
    act(() => openGroup('compliance'));
    expect(within(navEl().querySelector('[data-group="compliance"]')!).getByRole('button', { name: /Risk/ })).toBeTruthy();
    act(() => placeSections('Move risk back', [{ id: 'risk', group: 'tune', groupSeq: 99 }]));
    act(() => deleteGroup('compliance'));
    expect(navEl().querySelector('[data-group="compliance"]')).toBeNull();
    act(() => deleteGroup('tune'));   // a section of a deleted group is shown nowhere (legacy: the group is simply missing from GROUPS)
    expect(navEl().querySelector('[data-group="tune"]')).toBeNull();
    expect(ids(navEl())).not.toContain('risk');
  });
  it('label, colour, description and order of a group come from the document', () => {
    loadCase('golden');
    render(<NavZone />);
    act(() => { renameGroup('frame', 'A · Framing'); setGroupColor('frame', '#112233'); setGroupDescription('frame', 'First things first'); });
    const h = navEl().querySelector<HTMLElement>('#g-frame')!;
    expect(h.textContent).toBe('A · Framing▼');
    expect(h.title).toBe('First things first');
    expect(h.style.getPropertyValue('--dyn-group-color')).toContain('#112233');   // the rail colour (sections-b.css draws it)
    act(() => setGroupOrders('Move frame last', { frame: 999 }));
    expect(heads(navEl()).at(-1)).toBe('A · Framing');
    act(() => { appStore().undo(); });
    expect(heads(navEl())[0]).toBe('A · Framing');
  });
  it('the persona order overrides the global order and undo restores it', () => {
    loadCase('golden');
    render(<NavZone />);
    const frame = () => ids(navEl().querySelector<HTMLElement>('[data-group="frame"]')!);
    const before = frame();
    act(() => setPersonaSectionOrder('Reorder builder', 'builder', { [before.at(-1)!]: -1 }));
    expect(frame()[0]).toBe(before.at(-1));
    act(() => clearPersonaSectionOrder('builder', before.at(-1)!));
    expect(frame()).toEqual(before);
    act(() => { appStore().undo(); });
    expect(frame()[0]).toBe(before.at(-1));
  });
});

describe('dynamic sections', () => {
  const generate = () => {
    const groups = (doc().GROUPS as { id: string; label: string }[]);
    const d = newDashboard({ groupIds: ['tune'], allGroups: false, existing: [], groups, sections: SECTIONS, maxOrder: 5 })!;
    act(() => addDashboard(d));
    return d;
  };
  it('appear under their group, open through the dynamic view and respect persona visibility', async () => {
    loadCase('golden');
    render(<App />);
    menu();
    const d = generate();
    act(() => openGroup('tune'));
    const btn = within(navEl().querySelector('[data-group="tune"]')!).getByRole('button', { name: d.title });
    fireEvent.click(btn);
    expect((await screen.findByRole('heading', { level: 1, name: d.title }))).toBeTruthy();
    expect(screen.getByLabelText('Body rows')).toBeTruthy();   // the Board's live view of the stored dashboard
    act(() => removePersonaSection('builder', d.id));
    expect(ids(navEl())).not.toContain(d.id);
    act(() => setPersona('advanced'));
    expect(ids(navEl())).toContain(d.id);
  });
  it('an unknown section id does not crash the host', () => {
    loadCase('golden');
    uiStore.setState({ activeSection: 'nope' });
    render(<App />);
    expect(screen.getByRole('main').textContent).toMatch(/no longer exists/);
  });
});

describe('hide menu (per persona) and the group bar', () => {
  it('the persona flag collapses the sidebar into the group bar; the top-bar ☰ toggles it; the flag is live', () => {
    loadCase('golden');
    render(<App />);
    expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull();
    const bar = within(screen.getByRole('navigation', { name: 'Group navigation' }));
    expect(bar.getByLabelText('Group')).toBeTruthy();
    expect(bar.queryByRole('button', { name: /Menu/ })).toBeNull();
    expect(bar.queryByLabelText('Switch persona')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle the sidebar menu' }));
    expect(navEl()).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle the sidebar menu' }));
    expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull();
    act(() => setPersonaCompactNav('builder', false));
    expect(navEl()).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Group navigation' })).toBeNull();
  });
  it('lists the open group sections as buttons or tabs and switches group to its first section', () => {
    loadCase('golden');
    render(<App />);
    const bar = () => within(screen.getByRole('navigation', { name: 'Group navigation' }));
    expect(bar().getAllByRole('button').map((b) => b.textContent)).toContain(SECTIONS.find((x) => x.id === 'engagement-context')!.label);
    expect(bar().queryAllByRole('tab')).toHaveLength(0);
    act(() => setSectionNavStyle('tabs'));
    expect(bar().getAllByRole('tab').length).toBeGreaterThan(2);
    fireEvent.change(bar().getByLabelText('Group'), { target: { value: 'baseline' } });
    expect(uiStore.getState().activeSection).toBe('team-in');
    expect(bar().getAllByRole('tab', { selected: true })[0]!.textContent).toMatch(/Team|team/i);
  });
  it('selecting a persona lands on the first section of its menu', () => {
    loadCase('golden');
    render(<App />);
    act(() => { setGroupOrders('Configure first', { configure: 1 }); setPersonaSectionOrder('Board first', 'admin', { board: -5 }); });
    fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'admin' } });
    expect(uiStore.getState().activeSection).toBe('board');
    fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'advanced' } });
    expect(uiStore.getState().activeSection).toBe('home');
  });
});
