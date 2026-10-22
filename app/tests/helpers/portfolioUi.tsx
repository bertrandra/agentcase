import { act, render, screen } from '@testing-library/react';
import { setPersona } from '@/controllers/persona';
import { appStore } from '@/store/instance';
import { App } from '@/ui/App';
import { uiStore } from '@/ui/uiState';

/** Reset the view state, open the full application on a section as the Advanced persona (sees every section, full sidebar). */
export function mountApp(section = 'home'): void {
  uiStore.setState({ activeSection: section, toast: '', dockOpen: false, menuHidden: false, openGroup: null, fastPath: false, wiz: { active: false, pos: 0, visited: [] } });
  render(<App />);
  act(() => setPersona('advanced'));
}
/** Wait for the lazy section (its single h1) to render. */
export const sectionReady = (title: RegExp | string) => screen.findByRole('heading', { level: 1, name: title }, { timeout: 15000 });
export const pf = () => appStore().getState().portfolio;
/** The figure of a KPI tile of the headline bar. */
export const kpi = (label: RegExp): string => screen.getAllByText(label).find((e) => e.classList.contains('ac-kpi-l'))!.parentElement!.querySelector('.ac-kpi-v')!.textContent ?? '';
export const sidebar = () => screen.getByRole('navigation', { name: 'Sections' });
