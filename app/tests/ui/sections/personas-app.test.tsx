// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setPersona } from '@/controllers/persona';
import { appStore } from '@/store/instance';
import { NavZone } from '@/ui/shell/NavZone';
import Personas from '@/ui/sections/configure/personas';
import { loadCase } from '../../helpers/pdc';

afterEach(cleanup);
const LABEL = '🎨 Brand & theme';
const doc = () => appStore().getState().doc as Record<string, unknown>;
const navLabels = () => [...screen.getByRole('navigation', { name: 'Sections' }).querySelectorAll('[data-section]')].map((b) => b.textContent);

describe('Brand & theme is assignable like any section (DEV-APP-SECTION-PERSONAS)', () => {
  it('Section assignment removes it from Admin and adds it back; the legacy lists never change; undo works', () => {
    loadCase('golden');
    act(() => setPersona('admin'));
    render(<><NavZone /><Personas /></>);
    const lists = JSON.stringify(doc().PERSONA_SECTIONS);
    expect(navLabels()).toContain(LABEL);
    fireEvent.click(screen.getByRole('tab', { name: /Section assignment/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Persona' }), { target: { value: 'admin' } });
    expect(within(screen.getByLabelText('Sections of Admin')).getByText(LABEL)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(`Remove ${LABEL}`));
    expect(navLabels()).not.toContain(LABEL);
    expect(doc().PERSONA_APP_SECTIONS).toEqual({ admin: { 'brand-theme': false } });
    expect(JSON.stringify(doc().PERSONA_SECTIONS)).toBe(lists);
    expect(within(screen.getByLabelText('Sections of Admin')).queryByText(LABEL)).toBeNull();
    fireEvent.change(screen.getByLabelText('Available sections'), { target: { value: 'brand-theme' } });
    fireEvent.click(screen.getByText('➕ Add to Admin'));
    expect(navLabels()).toContain(LABEL);
    expect('PERSONA_APP_SECTIONS' in doc()).toBe(false);   // back to the catalogue default: the case is as before
    act(() => { appStore().undo(); });
    expect(navLabels()).not.toContain(LABEL);
    act(() => setPersona('advanced'));
    expect(navLabels()).toContain(LABEL);   // the protected Advanced persona always shows every section: the way back
  });
  it('the Persona layout board assigns it by double-click to a persona that does not show it by default', () => {
    loadCase('golden');
    act(() => setPersona('clientcase'));
    render(<><NavZone /><Personas /></>);
    expect(navLabels()).not.toContain(LABEL);
    fireEvent.click(screen.getByRole('tab', { name: /Persona layout/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Persona' }), { target: { value: 'clientcase' } });
    const board = screen.getByRole('list', { name: 'Persona layout' });
    fireEvent.doubleClick(board.querySelector('[data-section="brand-theme"]')!);
    expect(doc().PERSONA_APP_SECTIONS).toEqual({ clientcase: { 'brand-theme': true } });
    expect(navLabels()).toContain(LABEL);
    expect((doc().PERSONA_SECTIONS as Record<string, string[]>).clientcase).not.toContain('brand-theme');
  });
});
