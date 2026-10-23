// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Personas from '@/ui/sections/configure/personas';
import { freshStore } from '../../store/helpers';

/** axe-core on the Persona management tabs touched by the menu structures (colour contrast needs a browser: tools/a11y.mjs covers the default tab). */
beforeEach(() => { freshStore(); });
afterEach(cleanup);
const audit = async (c: HTMLElement): Promise<string[]> => {
  const r = await axe.run(c, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.html.slice(0, 120)}`);
};
const tab = (name: RegExp) => fireEvent.click(within(screen.getByRole('tablist', { name: 'Persona management views' })).getByRole('tab', { name }));

describe('persona management accessibility', () => {
  it('🧩 Section assignment: empty, with a persona, and on the wizard pill', async () => {
    const { container } = render(<Personas />);
    tab(/Section assignment/);
    expect(await audit(container)).toEqual([]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Persona' }), { target: { value: 'business-journey' } });
    expect(await audit(container)).toEqual([]);
    fireEvent.click(screen.getByRole('tab', { name: /Guided sequence \(wizard\)/ }));
    expect(await audit(container)).toEqual([]);
  });
  it.each([/Menu groups/, /📄 Sections/, /Menu layout/])('%s with the structure bar has no violation', async (name) => {
    const { container } = render(<Personas />);
    tab(name);
    fireEvent.change(screen.getByRole('combobox', { name: 'Menu structure' }), { target: { value: 'business-journey' } });
    expect(await audit(container)).toEqual([]);
  });
  it('the Sections detail card and live preview have no violation', async () => {
    const { container } = render(<Personas />);
    tab(/📄 Sections/);
    fireEvent.click(screen.getAllByRole('button', { pressed: false })[0]!);
    expect(screen.getByRole('region', { name: /Details of/ })).toBeTruthy();
    expect(await audit(container)).toEqual([]);
  });
});
