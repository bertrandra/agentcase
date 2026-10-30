import { describe, expect, it } from 'vitest';
import { setDisplayScope } from '@/controllers/displayScope';
import { nudgeBar } from '@/controllers/ganttEdit';
import { setInput } from '@/controllers/inputs';
import { recalibrateLce } from '@/controllers/modelEngine';
import { computeSensitivity } from '@/controllers/pdc';
import { setProductOverride } from '@/controllers/productOverrides';
import { activateSnapshot, captureSnapshot } from '@/controllers/snapshots';
import { addTheme, lastIssuedSeq } from '@/controllers/themes';
import { makeCtx } from '@/domain';
import { lceLoops } from '@/domain/model/lce';
import { computeDdSensitivity } from '@/domain/pdc/ddSens';
import { resolveProduct } from '@/domain/portfolio';
import { commonEditDoc } from '@/store/commonEdit';
import { activeDoc, editBase } from '@/store/editBase';
import { EMPTY_HISTORY } from '@/store/history';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';
import { docOnly, threeProducts } from '../helpers/portfolioStore';
import { keysOf, setScopeOverride } from '../helpers/scope';

/**
 * EDIT BASE (docs/ARCHITECTURE.md § 4): with "Change: All products" in a Portfolio view the case commands run on the COMMON case. Every controller
 * that used to read the active product's case to build a payload now computes inside run(draft) or reads `editBase()`; product A (active) overrides
 * the field, so a leak of A's value into the common values would show.
 */
const pf = () => appStore().getState().portfolio;
const docOf = (id: string) => resolveProduct(pf(), id) as Doc;
/** 3 products, A (active) overrides `ref`; the common value of `ref` is `common`. `view`: Portfolio view (All products) or the Product view. */
function setup(ref: string, own: string, common: string, view: 'portfolio' | 'product') {
  const t = threeProducts();
  setInput(ref.replace('values.', ''), common);
  setProductOverride(t.ids[0], ref, own);
  if (view === 'portfolio') setDisplayScope({ kind: 'portfolio' });
  t.s.setHistory(EMPTY_HISTORY);
  return t;
}
const exactUndo = (s: ReturnType<typeof threeProducts>['s'], before: string) => { s.undo(); expect(docOnly(s)).toBe(before); };

describe('editBase / activeDoc', () => {
  it('editBase is the common case in a Portfolio view with All products, else the active product\'s case; activeDoc is always the active product', () => {
    setup('values.y1Ramp', '30', '14', 'portfolio');
    expect(editBase()).toBe(commonEditDoc(pf()));
    expect(editBase().dom.values.y1Ramp).toBe('14');
    expect(activeDoc().dom.values.y1Ramp).toBe('30');
    setDisplayScope({ kind: 'product' });
    expect(editBase()).toBe(activeDoc());
  });
});

describe('controllers write the common value computed from the common case, never from the active product', () => {
  it('pdc.computeSensitivity: measured on the common case (not A); undo exact; Product view measures A as before', () => {
    const { s, ids } = setup('values.y1Ramp', '30', '14', 'portfolio'), before = docOnly(s);
    computeSensitivity();
    const sens = (pf().common as Record<string, unknown>).DD_SENS as { fp: string; base: number };
    expect(sens.fp).toBe(computeDdSensitivity(makeCtx(commonEditDoc(pf())), '2026-01-01T00:00:00.000Z').fp);
    expect(sens.fp).not.toBe(computeDdSensitivity(makeCtx(docOf(ids[0])), '2026-01-01T00:00:00.000Z').fp);
    exactUndo(s, before);
    setDisplayScope({ kind: 'product' }); computeSensitivity();
    expect(((pf().common as Record<string, unknown>).DD_SENS as { fp: string }).fp)
      .toBe(computeDdSensitivity(makeCtx(docOf(ids[0])), '2026-01-01T00:00:00.000Z').fp);
  });
  it('ganttEdit.nudgeBar (move): the common roadmap start moves from the COMMON date; A keeps its own; undo exact; Product view moves A', () => {
    const { s, ids } = setup('values.rmStart', '2026-06-01', '2026-01-05', 'portfolio'), before = docOnly(s);
    expect(nudgeBar({ name: 'Roadmap', dir: 1, big: true })).toMatch(/Roadmap: roadmap starts/);
    expect(pf().common.dom.values.rmStart).toBe('2026-01-12');
    expect(docOf(ids[0]).dom.values.rmStart).toBe('2026-06-01');
    exactUndo(s, before);
    setDisplayScope({ kind: 'product' });
    nudgeBar({ name: 'Roadmap', dir: 1, big: false });
    expect(docOf(ids[0]).dom.values.rmStart).toBe('2026-06-02');
    expect(pf().common.dom.values.rmStart).toBe('2026-01-05');
  });
  it('modelEngine.recalibrateLce: rebuilt on the common case and "moved" is judged on it; undo exact; Product view as before', () => {
    const t = threeProducts(), art = keysOf(pf().common).selectedArtefacts;
    setScopeOverride(t.ids[0], { selectedArtefacts: art.slice(0, 3) }); setDisplayScope({ kind: 'portfolio' }); t.s.setHistory(EMPTY_HISTORY);
    const before = docOnly(t.s), loops = editBase().MODEL.LCE.loops.map((l) => l.pAccept);
    const moved = recalibrateLce(), common = commonEditDoc(pf());
    expect(common.MODEL.LCE.loops).toEqual(lceLoops(makeCtx(common)).loops);
    expect(moved).toBe(loops.length !== common.MODEL.LCE.loops.length || common.MODEL.LCE.loops.some((l,
      i) => Math.abs(l.pAccept - (loops[i] ?? NaN)) > 1e-9 || loops[i] == null));
    exactUndo(t.s, before);
    setDisplayScope({ kind: 'product' }); recalibrateLce();
    expect(activeDoc().MODEL.LCE.loops).toEqual(lceLoops(makeCtx(docOf(t.ids[0]))).loops);
  });
  it('snapshots: the library acted on is the common one; capture + activate in the common editor are exact one-step undos', () => {
    const { s } = setup('values.y1Ramp', '30', '14', 'portfolio'), before = docOnly(s);
    captureSnapshot('Plan', new Date('2026-10-24T10:00:00Z'), 'a');
    expect((editBase().namedSnapshots as { id: string }[]).map((x) => x.id)).toEqual(['a']);
    const captured = docOnly(s);
    setInput('y1Ramp', 20);
    expect(activateSnapshot('a')).toBe(true);
    expect(pf().common.dom.values.y1Ramp).toBe('14');
    expect(pf().products[0]!.overrides.dom?.values?.y1Ramp).toBe('30');
    s.undo(); s.undo(); expect(docOnly(s)).toBe(captured);
    exactUndo(s, before);
  });
  it('themes.lastIssuedSeq reads the library the theme commands write (common)', () => {
    setup('values.y1Ramp', '30', '14', 'portfolio');
    addTheme('Mine');
    expect(lastIssuedSeq()).toBe(100);
    expect((pf().common as Record<string, unknown>).THEME_SEQ).toBe(100);
  });
});
