// @vitest-environment jsdom
import { caseValues } from '@/domain/process';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeCase } from '@/domain';
import { appStore } from '@/store/instance';
import Setup from '@/ui/sections/tune/setup';
import { freshStore } from '../../store/helpers';
import { editParam, expectReference } from '../../helpers/programmeParam';
import { expectParity, FIXTURES, loadFixture } from './tuneBHelpers';
vi.mock('@/domain/programme/profile', async (orig) => (await import('../../helpers/legacyProgramme')).legacyProfileMock(orig));   // legacy parity, B9b

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const doc = () => appStore().getState().doc;

describe('setup section', () => {
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const { container } = render(<Setup />);
    expectParity(fx, 'setup', container);
  });
  // B9a (DEV-B9A-CONTEXT-SCREENS): the setup lines are programme activities, edited in the Process section; the screen follows them
  it('the four lines add up to the total and follow the activities; the setup total reaches the case', () => {
    render(<Setup />);
    expect(screen.getAllByText('€135K').length).toBeGreaterThan(0);
    const before = computeCase(doc()).model.setupTotal;
    expectReference(/Setup coaching/, 'Setup: coaching');
    expect(screen.queryByText('Pair programming, deliverable review')).toBeNull();
    editParam('setupCoaching', 85000);
    expect(caseValues(doc()).setupCoaching).toBe('85000');
    expect(screen.getAllByText('€185K').length).toBeGreaterThan(0);
    expect(computeCase(doc()).model.setupTotal).toBeGreaterThan(before);
    act(() => { appStore().undo(); });
    expect(caseValues(doc()).setupCoaching).toBe('35000');
    expect(screen.getAllByText('€135K').length).toBeGreaterThan(0);
  });
  it('the transitional headcount coefficient is a COEF edit mirrored in the snapshot input, and undoable', () => {
    render(<Setup />);
    fireEvent.change(screen.getByLabelText(/Transitional setup headcount/), { target: { value: '3' } });
    expect(doc().COEF.setupETP).toBe(3);
    expect(doc().dom.values.setupETPCoef).toBe('3');
    act(() => { appStore().undo(); });
    expect(doc().COEF.setupETP).toBe(2);
  });
});
