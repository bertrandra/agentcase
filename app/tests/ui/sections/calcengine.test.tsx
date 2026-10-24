// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as domain from '@/domain';
import * as time from '@/domain/time';
import { setInput } from '@/controllers/inputs';
import { appStore } from '@/store/instance';
import CalcEngine from '@/ui/sections/refshare/calcengine';
import { NESTED, OVERLAID, overlayRows, relDelta } from '@/ui/sections/refshare/calcengine/model';
import surface from '@/content/refshare/calcengine-surface.json';
import { expectParity, FIXTURES, loadFixture } from '../../helpers/sectionParity';
import { freshStore } from '../../store/helpers';

beforeEach(() => { freshStore(); });
afterEach(cleanup);
const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));

describe('calcengine section', () => {
  it('shows the legacy headings; figures that described the legacy engine are ignored on purpose (4 fixtures)', () => {
    // 14 = legacy "14 entry points" (the TypeScript engine lists its own count, 21); 16.2 = the legacy spec section (§16.2) of TIME.thin(), which is
    // not ported yet
    expectParity('calcengine', CalcEngine, { ignore: [14, 16.2], headings: ['Calculation Engine', 'Time Engine', 'Engines', 'Function surface', 'Overlay contract', 'Which sections reach it', 'Engine function surface'] });
  });
  it('every entry point listed exists in the engine it points to', () => {
    const eng = time.timeFor(domain.makeCtx(appStore().getState().doc));
    for (const e of surface.entries) {
      if (e.kind === 'domain') expect(typeof (domain as Record<string, unknown>)[e.name], e.name).toBe('function');
      else if (e.kind === 'time') expect(typeof (time as Record<string, unknown>)[e.name], e.name).toBe('function');
      else expect(typeof (eng as unknown as Record<string, unknown>)[e.name], e.name).toBe('function');
    }
  });
  it('the declared overlay set is exactly what model() rewrites on top of modelRaw() (4 fixtures, two curve families)', () => {
    const changed = new Set<string>();
    for (const fx of [...FIXTURES, 'curve-gompertz', 'curve-bass', 'curve-legacy']) {
      loadFixture(fx);
      const c = domain.makeCtx(appStore().getState().doc), raw = domain.modelRaw(c) as unknown as Record<string, unknown>, over = domain.model(c) as unknown as Record<string, unknown>;
      for (const k of Object.keys(over)) {
        if (k.startsWith('_')) continue;
        if (JSON.stringify(over[k]) !== JSON.stringify(raw[k])) changed.add(k);
        if (k === 'conv' || k === 'cbd') {
          for (const sub of Object.keys(over[k] as object)) {
            const a = (over[k] as Record<string, unknown>)[sub], b = (raw[k] as Record<string, unknown>)[sub];
            if (!NESTED.includes(`${k}.${sub}`)) expect(JSON.stringify(a), `${fx}: ${k}.${sub} must not change`).toBe(JSON.stringify(b));
          }
        } else if (!OVERLAID.includes(k)) expect(JSON.stringify(over[k]), `${fx}: ${k} must not change`).toBe(JSON.stringify(raw[k]));
      }
    }
    expect([...changed].every((k) => OVERLAID.includes(k) || ['conv', 'cbd'].includes(k))).toBe(true);
    expect(NESTED.length).toBe(7);
    expect(changed.size).toBeGreaterThanOrEqual(8);
  });
  it('the overlay tab measures the live deltas and follows the case (curve legacy → nothing overlaid)', () => {
    render(<CalcEngine />);
    tab('🔀 Overlay contract');
    expect(screen.getByText(/rewritten by the engine, plus 7 nested/)).toBeTruthy();
    const o = overlayRows(domain.makeCtx(appStore().getState().doc));
    expect(o.rows.find((r) => r.field === 'yearSav')?.delta ?? 0).toBeGreaterThan(0);
    expect(relDelta([1, 2], [1, 3])).toBeCloseTo(1 / 3);
    expect(relDelta([0], [0])).toBe(0);
  });
  it('under a legacy curve nothing is overlaid: every delta is 0', () => {
    loadFixture('curve-legacy');
    const o = overlayRows(domain.makeCtx(appStore().getState().doc));
    expect(o.curve.startsWith('legacy')).toBe(true);
    expect(o.rows.filter((r) => r.source === 'OVERLAID').every((r) => r.delta === 0 || r.delta === null)).toBe(true);
  });
  it('the engines tab lists replaced engines, the command registry and a live audit log (edit → log → undo)', () => {
    render(<CalcEngine />);
    tab('⚙️ Engines');
    expect(screen.getByText('Nothing tracked yet — change something in the case.')).toBeTruthy();
    act(() => { setInput('y1Ramp', '33'); });
    expect(screen.getAllByText('input.set').length).toBeGreaterThan(1);   // registry row + audit row
    act(() => { appStore().undo(); });
    expect(screen.getAllByText('undo').length).toBeGreaterThan(0);
    expect(screen.getByText(/command types registered/)).toBeTruthy();
  });
  it('the function surface lists the registered curve families', () => {
    render(<CalcEngine />);
    expect(screen.getByText('spline.default')).toBeTruthy();
  });
});
