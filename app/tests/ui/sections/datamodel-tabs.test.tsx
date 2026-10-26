// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setProductOverride } from '@/controllers/productOverrides';
import { OVERRIDABLE_KEYS } from '@/domain/portfolio';
import { PORTFOLIO_FIELDS } from '@/domain/portfolio/fields';
import { VIEW_FIELDS } from '@/store/types';
import DataModel from '@/ui/sections/refshare/datamodel';
import CalcEngine from '@/ui/sections/refshare/calcengine';
import { axeViolations } from '../../helpers/axe';
import { view } from '../../helpers/aggUi';
import { mountApp, sectionReady } from '../../helpers/portfolioUi';
import { threeProducts } from '../../helpers/portfolioStore';
import { freshStore } from '../../store/helpers';

const TABS = ['🧭 Overview', '📄 Sections', '💾 State registry', '📊 Variable registry', '⚙️ Coefficients & namespaces', '🗂️ Document',
  '🎚️ Overridable keys', '🔄 Document vs view', '💽 Files & workbooks', '📦 Calculation packages'];
const caption = (text: string) => [...document.querySelectorAll('caption')].find((c) => c.textContent?.startsWith(text))?.closest('table');

const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));

describe('datamodel section: the document layers (lot 10)', () => {
  beforeEach(() => { freshStore(); });
  afterEach(cleanup);
  it('every tab renders tables with a caption or a heading and is axe clean', async () => {
    const { container } = render(<DataModel />);
    for (const t of TABS) {
      tab(t);
      if (t !== '🧭 Overview') expect(container.querySelectorAll('table thead th').length, t).toBeGreaterThan(0);
      expect(await axeViolations(container, { region: false }), t).toEqual([]);
    }
  }, 60000);
  it('the version badge is live, never a literal', () => {
    render(<DataModel />);
    expect(screen.getByText(/^This build: v\d/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('v18.8');
  });
  it('the document tab lists every field of the portfolio type, with its live value', () => {
    render(<DataModel />);
    tab('🗂️ Document');
    const t = caption('Portfolio (PortfolioDoc)')!;
    expect(t.querySelectorAll('tbody tr')).toHaveLength(Object.keys(PORTFOLIO_FIELDS).length);
    expect(t.textContent).toContain('agentcase.portfolio.v1'.length.toString());   // _schema: "string 22 chars"
    expect(screen.getByText(/migrations on open/)).toBeTruthy();
  });
  it('overridable keys follow the portfolio live (an override appears in the count)', () => {
    const { ids } = threeProducts();
    render(<DataModel />);
    tab('🎚️ Overridable keys');
    const t = caption('Keys a product can hold for itself')!, row = () => [...t.querySelectorAll('tbody tr')].find((r) => r.textContent?.startsWith('forceGlassCeiling'))!;
    expect(t.querySelectorAll('tbody tr')).toHaveLength(OVERRIDABLE_KEYS.length + 2);   // + the entry team and the form fields
    expect(row().textContent).toContain('0 / 3');
    act(() => { setProductOverride(ids[1], 'forceGlassCeiling', true); });
    expect(row().textContent).toContain('1 / 3');
    expect(screen.getByText('MODEL', { selector: '.ac-badge' })).toBeTruthy();   // the discount rate's namespace stays common
  });
  it('document vs view, files and packages are measured on the real writers', () => {
    render(<DataModel />);
    tab('🔄 Document vs view');
    expect(caption('View fields')!.querySelectorAll('tbody tr')).toHaveLength(VIEW_FIELDS.length);
    expect(screen.getAllByText('not broadcast')).toHaveLength(VIEW_FIELDS.length);
    tab('💽 Files & workbooks');
    expect(screen.getByText('SharedTeam')).toBeTruthy();
    expect(screen.getByText('Knowledge transfer')).toBeTruthy();
    tab('📦 Calculation packages');
    expect(screen.getAllByText('not compared')).toHaveLength(1);
  });
  it.each([['datamodel', /Data Model/], ['calcengine', /Calculation Engine/]])('%s under a Portfolio view: the section itself, every tab works',
    async (id, title) => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      threeProducts();
      mountApp(id);
      view('portfolio');
      await sectionReady(title);
      expect(document.querySelector('.ac-scope-banner')!.textContent).toContain('Independent of the view');
      for (const t of screen.getAllByRole('tab')) fireEvent.click(t);
      expect(err).not.toHaveBeenCalled();
      err.mockRestore();
    }, 60000);
  it('calcengine: every tab is axe clean', async () => {
    const { container } = render(<CalcEngine />);
    for (const name of ['🧩 Function surface', '🔀 Overlay contract', '🎯 Which sections reach it', '📏 Single sources', '⚙️ Engines']) {
      tab(name);
      expect(await axeViolations(container, { region: false }), name).toEqual([]);
    }
  }, 60000);
  it('calcengine shows the single sources of truth with live facts', () => {
    render(<CalcEngine />);
    tab('📏 Single sources');
    expect(screen.getByText('displayedPayback')).toBeTruthy();
    expect(screen.getByText(/0\.5 point/)).toBeTruthy();
    expect(screen.getByText(/→ month 4/)).toBeTruthy();   // the last-recovery payback on -10, 15, -10, 8 (the first crossing would be month 2)
    expect(screen.queryByText(/✗/)).toBeNull();   // stress cut and portfolio scenarios agree with the engine and the consolidation
  });
});
