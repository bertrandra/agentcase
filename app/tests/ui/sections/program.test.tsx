// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import Program from '@/ui/sections/tune/program';
import { fmtK } from '@/ui/widgets/tuneA';
import { freshStore } from '../../store/helpers';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';
import { loadFixture } from '../../helpers/tuneA';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const state = () => appStore().getState().doc;
const calc = () => computeCase(state());
const text = (c: HTMLElement) => renderedText(c).replace(/\s+/g, ' ');
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('program section', () => {
  it.each(['golden', 'ctx-msi', 'curve-logistic', 'industry-med'])('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Program />);
    expect(missingNumbers(legacySectionText(fx, 'program')!, renderedText(container))).toEqual([]);
  });
  it('pilot sizing: duration = prove weeks + 2 per break-in sprint; cost = FTE x years x working days x target day rate', () => {
    const { container } = render(<Program />);
    expect(text(container)).toMatch(/16 wk\s+Pilot duration/);
    edit('Pilot pod size (FTE)', '5'); edit('Break-in sprints', '3'); edit('Prove weeks', '16');
    const m = calc().model, cost = 5 * (22 / 52) * m.wd * m.tgtTJM;
    expect(state().dom.values.pilotFte).toBe('5');
    expect(text(container)).toMatch(/22 wk\s+Pilot duration/);
    expect(text(container).replace(/\s/g, '')).toContain(`${fmtK(cost)}Pilotcost(indicative)`);
    expect(text(container)).toMatch(/3 break-in sprint\(s\).*16 weeks proving milestones/);
  });
  it('capability build: share of the target mass and bars follow the three numbers', () => {
    const { container } = render(<Program />);
    edit('Operational now', '80'); edit('In training', '120'); edit('Target mass', '400');
    expect(text(container)).toMatch(/20\s*%\s*of the target mass is operational/);
    const bars = screen.getAllByRole('meter').map((b) => b.getAttribute('aria-valuenow'));
    expect(bars).toEqual(['20', '30', '100']);
  });
  it('token cache: reduction and cached $/dev-day; a 0 falls back to the default like the legacy P()||default', () => {
    const { container } = render(<Program />);
    expect(text(container)).toMatch(/~63%\s+Input cost reduction/);
    edit('Cacheable input share (%)', '40'); edit('Cache discount (%)', '60');
    expect(text(container)).toMatch(/~24%\s+Input cost reduction/);
    expect(text(container)).toMatch(/~\$11\s+\$\/dev-day \(cached, same model\)/);
    edit('Cacheable input share (%)', '0');
    expect(text(container)).toMatch(/~42%\s+Input cost reduction/);                // 70 % x 60 %: legacy quirk, ported as is
  });
  it('the engagement context drives the IP synthesis and the next maturity gate; none of it moves the euros', () => {
    const { container } = render(<Program />);
    const sav = calc().model.yearSav;
    expect(text(container)).toMatch(/Current engagement context: MSC/);
    expect(text(container)).toMatch(/Capgemini controls stack/);
    expect(text(container)).not.toMatch(/your next gate/);                          // L4 reached: nothing above
    act(() => { setInput('engagementCtx', 'STA'); });
    expect(text(container)).toMatch(/Current engagement context: STA/);
    expect(text(container)).toMatch(/Individual contribution; little asset reuse/);
    expect(text(container)).toMatch(/Current reached level: L\s*2/);
    expect(text(container)).toMatch(/L2 → L3 ◀ your next gate/);
    const sta = calc().model.yearSav;
    expect(sta[2]).not.toBe(sav[2]);                                               // the context itself is an engine input...
    edit('Pilot pod size (FTE)', '8'); edit('Prove weeks', '26');
    expect(calc().model.yearSav).toEqual(sta);                                     // ...the programme blocks are not
    act(() => { appStore().undo(); appStore().undo(); appStore().undo(); });
    expect(state().dom.values.engagementCtx).toBe('MSC');
    expect(calc().model.yearSav).toEqual(sav);
  });
  it('the pod count at Y3 sets the coordination overhead and the scaling stage (about 3 % per extra pod, capped at 20 %)', () => {
    loadFixture('team-large');
    const { container } = render(<Program />);
    const m = /Pods at Y3\s*(\d+)|(\d+)\s+Pods at Y3/.exec(text(container)), pods = parseInt((m?.[1] ?? m?.[2]) as string, 10);
    expect(pods).toBeGreaterThan(1);
    expect(text(container)).toContain(`~${Math.min(20, (pods - 1) * 3)}%`);
    expect(text(container)).toMatch(pods <= 3 ? /Team-of-teams — enabling coaching/ : pods <= 6 ? /Program level — ART coordination/ : /Portfolio level/);
  });
});
