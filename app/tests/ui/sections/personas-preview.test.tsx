// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SectionRow } from '@/domain/nav/layout';
import { appStore } from '@/store/instance';
import Personas from '@/ui/sections/configure/personas';
import { APP_SECTIONS } from '@/ui/zones/registry';
import { navInputs } from '../../helpers/nav';
import { loadCase } from '../../helpers/pdc';

beforeEach(() => { loadCase('golden'); });
afterEach(cleanup);
const state = () => appStore().getState();
const open = (tab: RegExp) => { render(<Personas />); fireEvent.click(screen.getByRole('tab', { name: tab })); };
const region = () => screen.getByRole('region', { name: /Live preview of the/ });
const previewIds = () => [...region().querySelectorAll<HTMLElement>('[data-psection]')].map((e) => e.dataset.psection);
const frame = () => navInputs(state().doc).sections.filter((s) => s.group === 'frame').sort((a, b) => a.groupSeq - b.groupSeq).map((s) => s.id);

describe('layout board live preview', () => {
  it('is a labelled region with no interactive element inside, following the picked persona', () => {
    open(/Menu layout/);
    expect(region().querySelector('button, a, input, select, textarea, [tabindex]')).toBeNull();
    fireEvent.change(screen.getByLabelText('Preview as'), { target: { value: 'advanced' } });
    expect(region().getAttribute('aria-label')).toBe('Live preview of the Advanced menu');
    expect(previewIds().length).toBe(navInputs(state().doc).sections.length + APP_SECTIONS.length);   // + 🎨 Brand & theme (an app section)
  });
  it('shows the would-be order while a card hovers, with no write, and returns to the real order on drag end', () => {
    open(/Menu layout/);
    fireEvent.change(screen.getByLabelText('Preview as'), { target: { value: 'advanced' } });
    const [first, second] = frame() as [string, string], doc = state().doc, rev = state().rev, undo = state().history.undo.length, audit = state().audit.length;
    const real = previewIds();
    const card = document.querySelector<HTMLElement>(`[data-section="${first}"]`)!, target = document.querySelector<HTMLElement>(`[data-section="${second}"]`)!;
    fireEvent.dragStart(card);
    fireEvent.dragOver(document.querySelector('[data-group="tune"]')!);
    expect(within(region()).getByText(/\(moving\)/).closest('[data-pgroup]')!.getAttribute('data-pgroup')).toBe('tune');
    expect(region().textContent).toContain('if dropped here');
    fireEvent.dragOver(target);
    expect(previewIds().indexOf(first)).toBeGreaterThan(-1);
    expect(state().doc).toBe(doc);
    expect(state().rev).toBe(rev);
    expect(state().history.undo.length).toBe(undo);
    expect(state().audit.length).toBe(audit);
    fireEvent.dragEnd(card);
    expect(previewIds()).toEqual(real);
    expect(region().textContent).not.toContain('(moving)');
    expect(state().doc).toBe(doc);
  });
  it('follows committed edits instantly (arrow move) and undo', () => {
    open(/Menu layout/);
    fireEvent.change(screen.getByLabelText('Preview as'), { target: { value: 'advanced' } });
    const [first, second] = frame() as [string, string];
    const at = (id: string) => previewIds().indexOf(id);
    expect(at(first)).toBeLessThan(at(second));
    fireEvent.click(document.querySelector<HTMLElement>(`[data-section="${first}"] [aria-label$="down"]`)!);
    expect(at(second)).toBeLessThan(at(first));
    expect((state().doc.sectionGroups as SectionRow[]).find((r) => r.id === first)!.groupSeq).toBe(20);
  });
  it('the persona board previews the edited persona and ignores a hover on an unassigned card', () => {
    open(/Persona layout/);
    expect(region().getAttribute('aria-label')).toMatch(/^Live preview of the .+ menu$/);
    const doc = state().doc, off = document.querySelector<HTMLElement>('.is-off[data-section]')!;
    fireEvent.dragStart(off);
    fireEvent.dragOver(document.querySelector('[data-group]')!);
    expect(region().textContent).not.toContain('(moving)');
    expect(state().doc).toBe(doc);
  });
});
