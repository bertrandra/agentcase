// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Scurve from '@/ui/sections/scope/scurve';
import { geoOf, H, W } from '@/ui/sections/scope/scurve/geometry';
import type { AppStore } from '@/store/core';
import { expectedModel, expectLikeFixture, loadFixture, modelOf, SECTION_FIXTURES } from '../../helpers/scopeToolsFixtures';
import { legacySectionText, missingNumbers, renderedText } from '../../helpers/parity';

afterEach(cleanup);
// jsdom has no PointerEvent: a MouseEvent carrying the pointer id is enough for the editor's handlers
if (!('PointerEvent' in window)) {
  class PointerEventShim extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventShim });
}
const pts = (s: AppStore) => s.getState().doc.scurve.pts;
const ramps = (s: AppStore) => ['y1Ramp', 'y2Ramp', 'y3Ramp'].map((id) => s.getState().doc.dom.values[id]);

/** Drag dot `i` of the editor to (month t, adoption a): pointer down on the dot, move on the svg, release. */
function drag(container: HTMLElement, i: number, t: number, a: number, N = 36) {
  const svg = container.querySelector('svg') as SVGSVGElement, g = geoOf(N);
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerDown(svg.querySelectorAll('.ac-dot')[i] as Element, { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(svg, { pointerId: 1, clientX: g.sx(t), clientY: g.sy(a) });
  fireEvent.pointerUp(svg, { pointerId: 1 });
}

describe('scurve section', () => {
  it.each(SECTION_FIXTURES)('shows every figure the legacy section showed (%s)', (fx) => {
    loadFixture(fx);
    const legacy = legacySectionText(fx, 'scurve');
    expect(legacy).not.toBeNull();
    const { container } = render(<Scurve />);
    expect(missingNumbers(legacy!, renderedText(container))).toEqual([]);
  });

  it('adding a point puts it in the widest gap on the curve; removing drops the middle one (legacy scAddPoint / scRemovePoint); two undo steps', () => {
    const s = loadFixture('golden');
    render(<Scurve />);
    fireEvent.click(screen.getByText('＋ point'));
    expect(pts(s)).toEqual([{ t: 12, a: 25 }, { t: 18, a: 39 }, { t: 24, a: 55 }, { t: 36, a: 100 }]);   // 39 = the spline's own value at month 18
    expect(document.querySelectorAll('.ac-dot')).toHaveLength(4);
    fireEvent.click(screen.getByText('－ point'));
    expect(pts(s)).toEqual([{ t: 12, a: 25 }, { t: 18, a: 39 }, { t: 36, a: 100 }]);   // the middle index (24) goes, as in the legacy editor
    expect((screen.getByText('－ point') as HTMLButtonElement).disabled).toBe(true);
    act(() => { s.undo(); s.undo(); });
    expect(pts(s)).toBeNull();
  });

  it('dragging five dots reproduces the legacy fixture sc-spline-5pt (points, Y1..Y3 ramps, Y1..Y3 savings), undo restores', () => {
    const s = loadFixture('golden'), before = modelOf(s).yearSav.slice();
    const { container } = render(<Scurve />);
    fireEvent.click(screen.getByText('＋ point')); fireEvent.click(screen.getByText('＋ point'));
    [[3, 2], [9, 20], [15, 30], [30, 80], [36, 97]].forEach(([t, a], i) => drag(container, i, t as number, a as number));
    expect(pts(s)!.map((p) => [p.t, Math.round(p.a)])).toEqual([[3, 2], [9, 20], [15, 30], [30, 80], [36, 97]]);
    expect(ramps(s)).toEqual(['25', '59', '97']);
    expectLikeFixture(s, 'sc-spline-5pt');
    expect(modelOf(s).yearSav[2]).not.toBe(before[2]);
    expect(screen.getByText('M30 · 80%')).toBeTruthy();
    act(() => { for (let i = 0; i < 7; i++) s.undo(); });
    expectLikeFixture(s, 'golden');
  });

  it('four dots at 6/10, 12/35, 24/70, 36/95 give the legacy spline-custom curve (engine reads the drawn points)', () => {
    const s = loadFixture('golden');
    const { container } = render(<Scurve />);
    fireEvent.click(screen.getByText('＋ point'));
    [[6, 10], [12, 35], [24, 70], [36, 95]].forEach(([t, a], i) => drag(container, i, t as number, a as number));
    expect(pts(s)!.map((p) => [p.t, Math.round(p.a)])).toEqual([[6, 10], [12, 35], [24, 70], [36, 95]]);
    // the fixture does not re-sample the anchors (it only sets the points), yet every yearly saving comes from the drawn points
    const exp = expectedModel('spline-custom').yearSav;
    modelOf(s).yearSav.forEach((v, i) => expect(v).toBeCloseTo(exp[i] as number, 3));
  });

  it('the family select refits the curve through the points and samples the anchors (legacy sc-logistic-seed / sc-gompertz-seed)', () => {
    const s = loadFixture('golden');
    render(<Scurve />);
    fireEvent.change(screen.getByLabelText(/Curve shape/), { target: { value: 'logistic' } });
    expect(s.getState().doc.scurve.family).toBe('logistic');
    expect(s.getState().doc.scurve.curve).toBe('logistic.default');
    expect(ramps(s)).toEqual(['13', '70', '100']);
    expectLikeFixture(s, 'sc-logistic-seed');
    fireEvent.change(screen.getByLabelText(/Curve shape/), { target: { value: 'gompertz' } });
    expectLikeFixture(s, 'sc-gompertz-seed');
    act(() => { s.undo(); s.undo(); });
    expectLikeFixture(s, 'golden');
  });

  it('the horizon select follows the legacy horizon-5 fixture and stretches the axis', () => {
    const s = loadFixture('golden');
    const { container } = render(<Scurve />);
    fireEvent.change(screen.getByLabelText(/Horizon/), { target: { value: '5' } });
    expectLikeFixture(s, 'horizon-5');
    expect(renderedText(container)).toMatch(/M\s*60/);
    expect(renderedText(container)).toMatch(/Y\s*5\s*\)/);
  });

  it('arrow keys move a focused dot; repeated presses are one undo step', () => {
    const s = loadFixture('golden');
    render(<Scurve />);
    const dot = () => screen.getByLabelText('Adoption point 2');
    fireEvent.keyDown(dot(), { key: 'ArrowRight' }); fireEvent.keyDown(dot(), { key: 'ArrowRight' });
    fireEvent.keyDown(dot(), { key: 'ArrowDown', shiftKey: true });
    expect(pts(s)![1]).toEqual({ t: 26, a: 50 });
    act(() => { s.undo(); });
    expect(pts(s)).toBeNull();
  });
});
