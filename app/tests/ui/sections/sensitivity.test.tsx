// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setInput } from '@/controllers/inputs';
import { makeCtx } from '@/domain';
import { sensitivityMatrix } from '@/domain/stress';
import { appStore } from '@/store/instance';
import Sensitivity from '@/ui/sections/stress/sensitivity';
import { loadExtra } from '../../helpers/extras';
import { missingFor, openFixture, PARITY_FIXTURES } from '../../helpers/stressParity';

afterEach(cleanup);

describe('sensitivity section', () => {
  it.each(PARITY_FIXTURES)('shows every figure the legacy section showed (%s), the matrix cells being the rerun ones (DEV-SENS-RERUN)', (fx) => {
    const legacyCells = (loadExtra('sensitivityView', fx) as { matrix: string[][] }).matrix.flatMap((r) => r.slice(1).map((x) => parseFloat(x)));
    expect(missingFor(Sensitivity, 'sensitivity', fx, legacyCells)).toEqual([]);
    const m = sensitivityMatrix(makeCtx(appStore().getState().doc)), { container, unmount } = render(<Sensitivity />);
    for (const cell of m.cells.flat()) expect(container.textContent).toContain(cell.text);
    unmount();
  });
  it('shows the six parameters with their level and the 4 × 5 matrix', () => {
    openFixture('golden');
    render(<Sensitivity />);
    expect(screen.getAllByText(/CRITICAL|HIGH|MEDIUM|LOW/)).toHaveLength(6);
    expect(screen.getByText('Glass 30%')).toBeTruthy();
    const m = sensitivityMatrix(makeCtx(appStore().getState().doc));
    expect(m.cells).toHaveLength(4);
    expect(screen.getAllByText(m.cells[0]![0]!.text).length).toBeGreaterThan(0);
  });
  it('the table follows the case (potential, ramp) and undo restores it', () => {
    openFixture('golden');
    render(<Sensitivity />);
    expect(screen.getByText('Automation potential').closest('tr')!.children[1]!.textContent).toBe('75%');
    act(() => { setInput('autoPotential', 60); });
    expect(screen.getByText('Automation potential').closest('tr')!.children[1]!.textContent).toBe('60%');
    act(() => { appStore().undo(); });
    expect(screen.getByText('Automation potential').closest('tr')!.children[1]!.textContent).toBe('75%');
  });
  it('a case without setup shows n/a in the matrix', () => {
    const s = openFixture('kh-off');
    for (const id of ['setupTooling', 'setupTraining', 'setupCoaching', 'setupGov']) s.dispatch({ type: 'test', label: 'zero setup', undoable: true, payload: id, run: (d, p) => { d.dom.values[p as string] = '0'; } });
    render(<Sensitivity />);
    expect(screen.getAllByText('n/a')).toHaveLength(20);
  });
});
