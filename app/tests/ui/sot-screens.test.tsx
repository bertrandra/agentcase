// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { engineNow, makeCtx } from '@/domain';
import { caseFte } from '@/domain/economics/fte';
import { headline } from '@/domain/economics/headline';
import { setupBreakdown } from '@/domain/tuneB/setup';
import { appStore } from '@/store/instance';
import { fmtE } from '@/ui/economicsFormat';
import Financial from '@/ui/sections/economics/financial';
import Setup from '@/ui/sections/tune/setup';
import Results from '@/ui/sections/verdict/results';
import FteVfte from '@/ui/sections/verifyA/fte-vfte';
import TeamOut from '@/ui/sections/verifyA/team-out';
import VfteOv from '@/ui/sections/verifyA/vfte-ov';
import Kpi from '@/ui/sections/verify/kpi';
import { eurK } from '@/ui/sections/tuneB/fmt';
import { fmtEur } from '@/ui/sections/stress/fmt';
import { loadFixture, statValue, tablesOf } from '../helpers/economics';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas
afterEach(cleanup);

/**
 * One source of truth on the screens (lot 10): the rendered screens print the owner figure — FTE freed / after (`fteBeforeAfter`), the setup total
 * (`setupBreakdown` = `model().setupTotal`) and the end-year savings (Time Engine) — so a screen that recomputes one on its own fails here.
 */
describe.each(['golden', 'hri-on', 'horizon-5'])('the screens print the owner figures (%s)', (id) => {
  const owners = () => { const c = makeCtx(appStore().getState().doc); return { c, f: caseFte(c), h: headline(c), H: engineNow(c).horizonYears }; };
  it('FTE freed: Financial (two bands), fte-vfte (band and table), vfte-ov, KPI', () => {
    loadFixture(id);
    const { f, H } = owners(), freed = f.freed.toFixed(1);
    let r = render(<Financial />);
    expect([statValue(r.container, `Freed FTE Y${H}`), statValue(r.container, `FTE freed Y${H}`)]).toEqual([freed, freed]);
    r.unmount(); r = render(<FteVfte />);
    expect(statValue(r.container, 'Freed capacity')).toBe(`${freed} FTE`);
    expect(tablesOf(r.container)[0]!.at(-1)!.at(-1)).toBe(`${freed} FTE`);
    r.unmount(); r = render(<VfteOv />);
    expect(tablesOf(r.container)[0]!.at(-1)!.at(-1)).toBe(`${freed} FTE`);
    r.unmount(); r = render(<Kpi />);
    expect(r.container.textContent).toContain(`${freed} FTE`);
    expect(r.container.textContent).toContain(`${f.before.toFixed(1)} → ${f.after.toFixed(1)}`);
  });
  it('FTE after: team-out total, Results residual human FTE', () => {
    loadFixture(id);
    const { f } = owners();
    let r = render(<TeamOut />);
    expect(statValue(r.container, 'Total recurring target')).toBe(f.after.toFixed(1));
    expect(statValue(r.container, 'Net reduction')).toBe(`-${Math.round(f.reductionPct)}%`);
    r.unmount(); r = render(<Results />);
    expect(r.container.textContent).toContain(`${f.after.toFixed(1)} residual human FTE`);
  });
  it('setup: the Agentic Setup total, the Investment total and the Results "after setup" are one figure; the lines add up', () => {
    loadFixture(id);
    const { c, h } = owners(), b = setupBreakdown(c);
    let r = render(<Setup />);
    expect(statValue(r.container, 'Total setup')).toBe(eurK(h.setup));
    expect(b.total).toBe(h.setup);
    r.unmount(); r = render(<Financial />);
    const inv = tablesOf(r.container).find((t) => t[0]?.[0] === 'Category')!;
    expect(inv.at(-1)![1]).toBe(fmtE(h.setup));
    expect(inv.slice(1, -1).map((row) => row[0])).toHaveLength(b.lines.length);
    r.unmount(); r = render(<Results />);
    expect(r.container.textContent).toContain(`after ${fmtEur(h.setup)} setup`);
  });
  it('end-year savings: Results "total savings / yr" is the Time-Engine end year', () => {
    loadFixture(id);
    const end = engineNow(owners().c).years().at(-1)!, r = render(<Results />);
    expect(r.container.textContent).toContain(`= ${fmtEur(end.savings)} total savings / yr`);
  });
});
