import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { setRegInclude } from '@/controllers/frame';
import { computeCase, makeCtx } from '@/domain';
import { VARIABLES } from '@/domain/pdc/variables';
import { scopeOf } from '@/domain/process';
import { appStore } from '@/store/instance';
import { overridesInStore } from '@/store/persistence/bpmn/caseDoc';
import { legacyCase } from '@/store/persistence/bpmn/legacy';
import { fromSnapshot, toSnapshot } from '@/store/persistence/snapshot';
import { loadFixture } from '../ui/sections/frameHelpers';
vi.mock('@/domain/programme/profile', async (orig) => (await import('../helpers/legacyProgramme')).legacyProfileMock(orig));   // legacy parity, B9b

/**
 * BPMN B9a, DEV-REGINCLUDE-DERIVED: "Include regulatory artefacts" is the process's `regInclude` only. The form copy `dom.checked.regInclude` is
 * dropped on open, never saved, never written by the command; the On/Off variable `tgRegInclude` and the legacy shape (parameters workbook,
 * excel-compat) read the process. The oracle fixture frame-industry-cross holds the box ticked with `regInclude` false: its variable reads Off.
 */
const raw = (id: string) => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as Record<string, unknown>;
const tg = (c: ReturnType<typeof makeCtx>) => VARIABLES.find((v) => v.id === 'tgRegInclude')!.get(c);

describe('regInclude: one value, the process', () => {
  it('frame-industry-cross: the stale ticked box is dropped on open; the variable reads the process (Off); no figure moves', () => {
    const r = raw('frame-industry-cross');
    expect([(r.dom as { checked: Record<string, boolean> }).checked.regInclude, r.regInclude]).toEqual([true, false]);
    const doc = fromSnapshot(r);
    expect('regInclude' in doc.dom.checked).toBe(false);
    expect(scopeOf(doc).regInclude).toBe(false);
    expect(tg(makeCtx(doc))).toBe(false);
    const expected = JSON.parse(readFileSync('fixtures/expected/frame-industry-cross.json', 'utf8'));
    expect(computeCase(doc).headline.totalSavings).toBeCloseTo(expected.headline.totalSavings, 4);
    expect((toSnapshot(doc).dom as { checked: Record<string, boolean> }).checked).not.toHaveProperty('regInclude');
    expect((legacyCase(doc).dom as { checked: Record<string, boolean> }).checked.regInclude).toBe(false);   // the legacy shape derives it
  });
  it('the command writes the process only; the variable and the legacy shape follow; undo restores', () => {
    loadFixture('golden');
    const d0 = appStore().getState().doc;
    expect(scopeOf(d0).regInclude).toBe(true);
    setRegInclude(false);
    const d = appStore().getState().doc;
    expect([scopeOf(d).regInclude, 'regInclude' in d.dom.checked, tg(makeCtx(d))]).toEqual([false, false, false]);
    expect((legacyCase(d).dom as { checked: Record<string, boolean> }).checked.regInclude).toBe(false);
    appStore().undo();
    expect([scopeOf(appStore().getState().doc).regInclude, tg(makeCtx(appStore().getState().doc))]).toEqual([true, true]);
  });
  it('a product override of the box (an older portfolio file) is dropped on open', () => {
    expect(overridesInStore({ 'checked.regInclude': true, 'values.rmD1': '5' }, {} as never)).toEqual({ 'values.rmD1': '5' });
  });
});
