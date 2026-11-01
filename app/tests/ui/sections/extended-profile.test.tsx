// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { exportProcessFiles } from '@/controllers/bpmn';
import { COLOR_NS, diagramsOf } from '@/domain/process/profile';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { ExtendedProfile } from '@/ui/sections/scope/process/profile/ExtendedProfile';
import { axeViolations } from '../../helpers/axe';
import { freshStore } from '../../store/helpers';

/**
 * SPEC_FIXES FX-10 (§ 17): the extended profile of the process in 🧩 Process (data, events, library, collaboration; read-only), and the export's
 * display options (colours by scope / type / authority, one diagram per phase).
 */
afterEach(cleanup);
const sample = parseBpmn(readFileSync('fixtures/bpmn/extended-agentcase.bpmn', 'utf8')).doc!;

describe('extended profile', () => {
  it('the four views list what the extended sample holds; axe clean', async () => {
    const { container } = render(<ExtendedProfile doc={sample} />);
    const region = screen.getByRole('region', { name: 'Extended profile' });
    fireEvent.click(within(region).getByRole('button', { name: /^Show the data, events/ }));   // closed by default (view state)
    expect(within(region).getByRole('table', { name: 'Deliverables' }).textContent).toContain('testSuite');
    fireEvent.click(screen.getByRole('tab', { name: 'Events' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Collaboration' }));
    expect(within(region).getByRole('table', { name: 'Pools' }).textContent).toContain('Test vendors');
    expect(within(region).getByRole('table', { name: 'Message flows' }).textContent).toContain('A030');
    fireEvent.click(screen.getByRole('tab', { name: 'Library' }));
    expect(await axeViolations(container, { region: false })).toEqual([]);
  });
  it('the export colours the activities and adds a diagram per phase when asked', () => {
    freshStore();
    const plain = exportProcessFiles('shown')[0]!.text, shaped = exportProcessFiles('shown', false, new Date(0), false, 'delivery', false,
      { colours: 'type', phaseDiagrams: true })[0]!.text;
    expect(plain).not.toContain(COLOR_NS);
    expect(shaped).toContain(COLOR_NS);
    expect(diagramsOf(parseBpmn(shaped).doc!.root).length).toBeGreaterThan(diagramsOf(parseBpmn(plain).doc!.root).length);
  });
});
