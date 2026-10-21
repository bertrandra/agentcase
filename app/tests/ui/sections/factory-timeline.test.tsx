// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setField } from '@/controllers/factory';
import { loadDemoDataset } from '@/controllers/factoryActions';
import { appStore } from '@/store/instance';
import Section from '@/ui/sections/factory/factory-timeline';
import { PARITY_FIXTURES, loadFixture } from '../../helpers/fixtureStore';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadExtra } from '../../helpers/oracleDiff';

afterEach(cleanup);
const card = (id: string, root: HTMLElement) => root.querySelector(`[data-kpi="${id}"]`) as HTMLElement;
const shown = (id: string, root: HTMLElement) => card(id, root).querySelector('.ac-stat-v')!.textContent;

describe('factory-timeline section (KPIs, business chain, dated events)', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const legacy = legacySectionText(fx, 'factory-timeline');
    expect(legacy).not.toBeNull();
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });
  it('an empty factory: rates show a dash and their sample size, task shares follow the scope, the timeline asks for data', () => {
    loadFixture('golden');
    const { container } = render(<Section />);
    expect(shown('fmDeployFreq', container)).toBe('—');
    expect(card('fmDeployFreq', container).textContent).toContain('insufficient sample (n=0)');
    expect(shown('fmAutonomousCompletion', container)).toBe('70%');
    expect(shown('fmHumanIntervention', container)).toBe('30%');
    expect(shown('fmCommitVolume', container)).toBe('0');
    expect(screen.getByText(/No dated factory events yet/)).toBeTruthy();
    expect(screen.getByText('(not set)')).toBeTruthy();
  });
  it.each(['fm-demo', 'fm-generated', 'fm-generated-tuned'])('every KPI card reads exactly what the legacy card read · %s', (fx) => {
    loadFixture(fx);
    const { container } = render(<Section />);
    const exp = loadExtra<Record<string, { thin: boolean; n: number | null; disp: string }>>('fm_cards', fx);
    for (const [id, e] of Object.entries(exp)) {
      expect(shown(id, container), id).toBe(e.disp);
      expect(card(id, container).textContent?.includes('insufficient sample'), id).toBe(e.thin);
    }
  });
  it('the demo dataset draws the business chain and one swimlane per event type, with the real counts', () => {
    loadFixture('fm-demo');
    render(<Section />);
    expect(screen.getByText(/Transform the claims-processing platform/)).toBeTruthy();
    expect(screen.getByText('Customer Experience Platform').parentElement!.textContent).toContain('(2 epics)');
    expect(screen.getByText('Rules+LLM triage engine').parentElement!.textContent).toContain('(2 stories)');
    const lane = (name: string) => screen.getByRole('group', { name });
    expect(lane('Commits').textContent).toContain('(18)');
    expect(lane('Deployments').textContent).toContain('(14)');
    expect(lane('Approvals').textContent).toContain('(4)');   // only decided approvals have a date (one is Pending)
    expect(within(lane('Builds')).getAllByTitle(/nightly-/)).toHaveLength(7);
    expect(screen.getByText(/dated event\(s\) across/).textContent).toMatch(/^\d+ dated event\(s\)/);
  });
  it('the KPIs follow the records: a failed gate marked Pass lifts the pass rate; loading the demo fills a dash', () => {
    loadFixture('fm-demo');
    const { container } = render(<Section />);
    expect(shown('fmGatePassRate', container)).toBe('83%');       // 5 of the 6 decided gates
    act(() => { setField('QUALITY_GATES', 'qg-4', 'result', 'Pass'); });
    expect(shown('fmGatePassRate', container)).toBe('100%');
    act(() => { appStore().undo(); });
    expect(shown('fmGatePassRate', container)).toBe('83%');
    expect(shown('fmRollbackRate', container)).toBe('7%');        // 1 rolled back of 14 deployments
  });
  it('loading the demo into an empty case moves the dash to real figures (undo brings it back)', () => {
    loadFixture('golden');
    const { container } = render(<Section />);
    act(() => { loadDemoDataset(); });
    expect(shown('fmCommitVolume', container)).toBe('18');
    expect(shown('fmBuildSuccessRate', container)).toBe('71%');   // 5 of the 7 demo builds
    act(() => { appStore().undo(); });
    expect(shown('fmCommitVolume', container)).toBe('0');
  });
});
