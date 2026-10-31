// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { goSection, openGroup } from '@/ui/uiState';
import { SECTIONS } from '@/ui/zones/registry';
import { freshStore } from '../store/helpers';
import { mountApp, pf, sectionReady, sidebar } from '../helpers/portfolioUi';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('one product: the interface is unchanged (spec F23)', () => {
  it('no product selector, no edit-scope toggle in the top bar', () => {
    mountApp();
    expect(screen.queryByRole('combobox', { name: 'Show' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Change' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Change' })).toBeNull();
    expect(document.querySelector('.ac-prodbar')).toBeNull();
  });
  it('the sidebar has the 14 original groups and none of the Portfolio sections, although the catalogue holds them', () => {
    // 79 legacy + 6 Portfolio + 6 app sections (🎨 Brand & theme, 🧩 Process, 📋 Programme, 🏢 Organisation, 🔎 Audit, 🧭 Who does what)
    expect(SECTIONS).toHaveLength(91);
    mountApp();
    expect(sidebar().querySelectorAll('section[data-group]')).toHaveLength(14);
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeNull();
    expect(sidebar().querySelectorAll('[data-section]')).toHaveLength(85);   // the 79 case sections + the 6 app sections
  });
  it('sections edit as before: no banner, no inherited / overridden chip', async () => {
    mountApp('scope-sel');
    await sectionReady(/Scope/);
    for (const id of ['phase-scope', 'scurve', 'engagement-context', 'transform-params', 'loc-strat', 'team-in']) {
      act(() => goSection(id));
      await screen.findByRole('heading', { level: 1 });
      expect(document.querySelector('.ac-prod-banner, .ac-ovr'), id).toBeNull();
    }
  });
  it('Welcome offers "Add a product"; it adds the second product, shows the group and opens Products', async () => {
    mountApp();
    fireEvent.click(screen.getByRole('button', { name: 'Add a product' }));
    expect(pf().products).toHaveLength(2);
    await sectionReady(/Products/);
    act(() => openGroup('portfolio'));
    expect(sidebar().querySelector('[data-group="portfolio"]')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Show' })).toBeTruthy();
  });
});
