// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import ScopeSel from '@/ui/sections/scope/scope-sel';
import { freshStore } from '../../store/helpers';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { keysOf } from '../../helpers/scope';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const calc = () => computeCase(appStore().getState().doc);

describe('scope-sel section', () => {
  it('shows every figure the legacy section showed (golden case)', () => {
    const { container } = render(<ScopeSel />);
    const legacy = legacySectionText('golden', 'scope-sel');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('phase checkboxes and artefact checkboxes edit the scope (counts, KPIs, undo)', () => {
    render(<ScopeSel />);
    expect(screen.getByText(/In scope : 10\/53 SDLC art\./)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Show selected only'));          // show everything
    fireEvent.click(screen.getByLabelText('Phase V2'));                    // switch a whole phase on
    expect(screen.getByText(/In scope : 16\/53/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Phase V2'));                    // and off again
    expect(screen.getByText(/In scope : 10\/53/)).toBeTruthy();
    act(() => { appStore().undo(); });
    expect(screen.getByText(/In scope : 16\/53/)).toBeTruthy();
  });
  it('select all / clear all', () => {
    render(<ScopeSel />);
    fireEvent.click(screen.getByText('Select all'));
    expect(screen.getByText(/In scope : 53\/53/)).toBeTruthy();
    fireEvent.click(screen.getByText('Clear all'));
    expect(screen.getByText(/In scope : 4\/53/)).toBeTruthy();   // keeps only the first phase (L0, 4 artefacts)
  });
  it('the adjust table edits % auto and effort; the live strip follows; bulk sets a phase', () => {
    const { container } = render(<ScopeSel />);
    fireEvent.click(container.querySelector('summary')!.parentElement!.querySelectorAll('summary')[0]!);
    const adjust = screen.getByText(/Adjust % auto/).closest('details')!;
    adjust.setAttribute('open', '');
    const before = calc().model;
    fireEvent.change(within(adjust).getByLabelText('% auto of A017'), { target: { value: '100' } });
    expect(calc().model.auto).toBeGreaterThan(before.auto);
    expect(within(adjust).getByText(/Potential/).textContent).toMatch(/▲/);
    fireEvent.change(within(adjust).getByLabelText('Effort of A017'), { target: { value: '20' } });
    expect(keysOf(appStore().getState().doc).artefactsEdited.find((e) => e.id === 'A017')?.effort).toBe(20);
    fireEvent.change(within(adjust).getByRole('combobox'), { target: { value: 'V4' } });
    fireEvent.change(within(adjust).getByLabelText('Bulk % auto'), { target: { value: '100' } });
    fireEvent.click(within(adjust).getByText('Apply'));
    expect(within(adjust).getAllByLabelText(/% auto of A0/).every((i) => (i as HTMLInputElement).value === '100')).toBe(true);
  });
  it('the impact rows add up to the ceiling and the biggest contributor comes first, in red', () => {
    const { container } = render(<ScopeSel />);
    const pts = [...container.querySelectorAll('.ac-impact-row summary b')].map((e) => parseFloat((e.textContent ?? '').replace('+', '')));
    expect(pts.length).toBeGreaterThan(0);
    expect(Math.abs(pts.reduce((a, b) => a + b, 0) - calc().model.ceiling)).toBeLessThanOrEqual(0.1 * pts.length);
    expect([...pts].sort((a, b) => b - a)).toEqual(pts);
    expect((container.querySelector('.ac-impact-row summary b') as HTMLElement).dataset.tone).toBe('brick');
  });
});
