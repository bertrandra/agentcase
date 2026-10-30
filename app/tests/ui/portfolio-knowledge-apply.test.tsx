// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setActiveProduct, setEditScope } from '@/controllers/product';
import { setProductKnowledge } from '@/controllers/productOverrides';
import { appStore } from '@/store/instance';
import Knowledge from '@/ui/sections/tune/knowledge';
import { axeViolations } from '../helpers/axe';
import { pf } from '../helpers/portfolioUi';
import { docOnly } from '../helpers/portfolioStore';
import { eachThree } from '../helpers/threeEach';
import { renderProgrammePanel } from '../helpers/programmePanel';

vi.mock('@/ui/widgets/ChartPanel', async () => import('../helpers/chartStub'));   // jsdom has no canvas

const three = eachThree(), id = (i: number): string => three().ids[i] as string;
const prod = (i: number) => pf().products[i]!;
function openFor(i: number): void {
  act(() => { setActiveProduct(id(i)); setEditScope('product'); });
  render(<Knowledge />);
}
/** B9a (DEV-B9A-CONTEXT-SCREENS): the hub's target, setup base and the KT preparation are edited in the Process section's parameter panel. */
function openPanelFor(i: number, kind: string): void {
  act(() => { setActiveProduct(id(i)); setEditScope('product'); });
  renderProgrammePanel(kind);
}

describe('Knowledge subset: “Apply to all products” (spec F7)', () => {
  it('Target CC: the value becomes the common one, identical subset values are dropped, the others kept; one undo step', async () => {
    act(() => {
      setProductKnowledge(id(1), { targetCC: 1 }); setProductKnowledge(id(2), { targetCC: 1, curationFTE: 2 }); setProductKnowledge(id(0), { targetCC: 3 });
    });
    openPanelFor(1, 'hubSetup');
    const before = docOnly(appStore());
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all products: Target CC' }));
    expect(pf().common.dom.values.khTargetCC).toBe('1');
    expect([prod(0), prod(1), prod(2)].map((p) => p.knowledge.targetCC)).toEqual([3, undefined, undefined]);
    expect(prod(2).knowledge.curationFTE).toBe(2);
    expect(screen.getByRole('group', { name: 'Target CC: inherited' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Apply to all products: Target CC' })).toBeNull();
    act(() => { appStore().undo(); });
    expect(docOnly(appStore())).toBe(before);
    expect(prod(1).knowledge.targetCC).toBe(1);
  });

  it('the hub switch keeps the portfolio hub in step', () => {
    act(() => { setProductKnowledge(id(0), { enabled: !pf().common.dom.checked.khEnabled }); });
    const on = prod(0).knowledge.enabled;
    openFor(0);
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all products: Hub use' }));
    expect(!!pf().common.dom.checked.khEnabled).toBe(on);
    expect(pf().hub.enabled).toBe(on);
    expect(prod(0).knowledge.enabled).toBeUndefined();
  });

  it('fields without a common level (preparation months) keep only “Revert to common”; axe finds no violation', async () => {
    act(() => { setProductKnowledge(id(1), { ktLeadMonths: 2, setupBase: 12345 }); });
    openPanelFor(1, 'ktPrep');
    expect(screen.getByRole('button', { name: 'Revert to common: Knowledge transfer preparation' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Apply to all products: Knowledge transfer preparation' })).toBeNull();
    expect(await axeViolations(document.body, { region: false })).toEqual([]);
    cleanup();
    renderProgrammePanel('hubSetup');
    expect(screen.getByRole('button', { name: 'Apply to all products: Setup base' })).toBeTruthy();
  });
});
