// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { normArtefacts } from '@/domain/frame';
import { appStore } from '@/store/instance';
import TransformParams from '@/ui/sections/frame/transform-params';
import { FIXTURES, loadFixture, parityGap } from './frameHelpers';
import { keysOf } from '../../helpers/scope';

afterEach(cleanup);
const doc = () => appStore().getState().doc;
const calc = () => computeCase(doc());

describe('transform-params section', () => {
  // The "(NN reg. art.)" counts in the select come from the catalogue; the legacy dump lists the same options.
  it.each(FIXTURES)('shows every figure the legacy section showed (%s)', (f) => {
    loadFixture(f);
    const { container } = render(<TransformParams />);
    expect(parityGap(f, 'transform-params', container)).toEqual([]);
  });
  it('the norm panel stays hidden until the regulatory catalogue is switched on', () => {
    loadFixture('golden');
    render(<TransformParams />);
    expect(screen.queryByText(/regulatory artifacts/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/Use Regulatory catalog/));
    expect(doc().regUse).toBe(true);
    expect(screen.getByText('Pick an industry above to see its applicable norms.')).toBeTruthy();
  });
  it('picking an industry pre-checks its norms, raises the glass ceiling and is one undo step', () => {
    loadFixture('golden');
    render(<TransformParams />);
    const before = calc().model;
    fireEvent.click(screen.getByLabelText(/Use Regulatory catalog/));
    fireEvent.change(screen.getByLabelText('Industry / regulatory profile'), { target: { value: 'MED' } });
    expect(doc().dom.values.industry).toBe('MED');
    expect(keysOf(doc()).selectedNorms).toHaveLength(4);
    expect(keysOf(doc()).selectedRegArtefacts).toHaveLength(33);
    const ceiling = /Weighted glass ceiling from selection: 75% \(mean human sup. on 33 artifacts\)/;
    expect(screen.getByText((_, el) => el?.tagName === 'P' && ceiling.test(el.textContent ?? ''))).toBeTruthy();
    expect(screen.getByText('33')).toBeTruthy();
    expect(calc().model.ceiling).toBeGreaterThan(before.ceiling);
    act(() => { appStore().undo(); });
    expect(keysOf(doc()).selectedNorms).toHaveLength(0);
    expect(calc().model.ceiling).toBe(before.ceiling);
  });
  it('ticking and unticking a norm adds and removes its artefacts; the include switch is stored', () => {
    loadFixture('industry-med');
    render(<TransformParams />);
    const mine = new Set(normArtefacts('MED', 'ISO 13485').map((a) => a.id)), left = keysOf(doc()).selectedRegArtefacts.filter((id) => !mine.has(id)).length;
    expect(left).toBeLessThan(33);
    fireEvent.click(screen.getByLabelText(/ISO 13485/));
    expect(keysOf(doc()).selectedNorms).not.toContain('MED:ISO 13485');
    expect(keysOf(doc()).selectedRegArtefacts).toHaveLength(left);
    expect(screen.getByText(String(left))).toBeTruthy();
    const withReg = calc().model;
    fireEvent.click(screen.getByLabelText(/Include reg. artifacts/));
    expect(keysOf(doc()).regInclude).toBe(false);
    expect(calc().model).not.toEqual(withReg);   // reg. artefacts leave the effort / ceiling population
    act(() => { appStore().undo(); appStore().undo(); });
    expect(keysOf(doc()).selectedRegArtefacts).toHaveLength(33);
  });
  it('cross-cutting categories add their norms independently of the industry and reveal a norm picker', () => {
    loadFixture('golden');
    render(<TransformParams />);
    const ai = screen.getByLabelText(/🤖 AI/);
    fireEvent.click(ai);
    expect(keysOf(doc()).selectedNorms.filter((k) => k.startsWith('AI:'))).toHaveLength(3);
    expect(doc().dom.checked.crossAI).toBe(true);
    const picker = screen.getByText('EU AI Act').closest('label')!.parentElement as HTMLElement;
    fireEvent.click(within(picker).getByLabelText(/EU AI Act/));
    expect(keysOf(doc()).selectedNorms.filter((k) => k.startsWith('AI:'))).toHaveLength(2);
    expect((screen.getByLabelText(/🤖 AI/) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText(/🤖 AI/));                 // unticking the category removes the rest
    expect(keysOf(doc()).selectedNorms).toHaveLength(0);
    expect(keysOf(doc()).selectedRegArtefacts).toHaveLength(0);
  });
});
