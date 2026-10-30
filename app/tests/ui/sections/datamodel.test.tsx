// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setCustomerName } from '@/controllers/persona';
import { appStore } from '@/store/instance';
import DataModel from '@/ui/sections/refshare/datamodel';
import { uiStore } from '@/ui/uiState';
import { SECTIONS } from '@/ui/zones/registry';
import { expectParity } from '../../helpers/sectionParity';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);

describe('datamodel section', () => {
  it('shows every figure and heading the legacy overview showed (4 fixtures)', () => {
    // 79 sections / 42 'supports' in the legacy; the catalogue now also holds the 6 Portfolio sections and 3 app sections:
    // 🎨 Brand & theme, 🏢 Organisation, 🧭 Who does what (88 / 51).
    // 84 case keys in the legacy; 76 since schema v3 (BPMN B3): the 9 scope keys are one process document, key BPMN (docs/SPEC_BPMN.md § 6.1).
    expectParity('datamodel', DataModel,
      { ignore: [79, 42, 84], headings: ['Data Model', 'The four layers', 'Sections', 'State registry', 'Variable registry', 'Coefficients & namespaces',
      'Sections by build-path tag', 'drives × 22', 'reads × 13', 'supports × 51'] });
  });
  it('the overview cards jump to their table; every table is complete', () => {
    render(<DataModel />);
    fireEvent.click(screen.getByText('📄 Sections', { selector: 'div' }));
    expect(screen.getByText(/88 rows, grouped by menu group/)).toBeTruthy();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(SECTIONS.length);
    fireEvent.click(screen.getByRole('tab', { name: '📊 Variable registry' }));
    expect(document.querySelectorAll('tbody tr')).toHaveLength(166);
    fireEvent.click(screen.getByRole('tab', { name: '💾 State registry' }));
    expect(document.querySelectorAll('tbody tr')).toHaveLength(84 - 9 + 1);   // schema v3: the scope keys are the process document (BPMN)
  });
  it('coefficients show default vs current live, and rows link to their section', () => {
    render(<DataModel />);
    fireEvent.click(screen.getByRole('tab', { name: '⚙️ Coefficients & namespaces' }));
    const row = screen.getByText('vtaxCap').closest('tr')!;
    expect(within(row).getAllByText('0.6')).toHaveLength(2);
    fireEvent.click(within(row).getByRole('button'));
    expect(uiStore.getState().activeSection).toBe('eligibility');
    expect(screen.getAllByText('10 namespaces holding everything not a per-section input', { exact: false })).toBeTruthy();
  });
  it('the state table follows the document (edit → document → undo)', () => {
    render(<DataModel />);
    fireEvent.click(screen.getByRole('tab', { name: '💾 State registry' }));
    const size = () => screen.getByText('customerName').closest('tr')!.textContent;
    expect(size()).toContain('0 chars');
    act(() => { setCustomerName('ACME'); });
    expect(size()).toContain('4 chars');
    act(() => { appStore().undo(); });
    expect(size()).toContain('0 chars');
  });
});
