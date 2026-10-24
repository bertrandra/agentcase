import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { setChecked, setInput } from '@/controllers/inputs';
import { setLifecyclePos } from '@/controllers/lifecycle';
import { assignWave, addWave, removeWave, renameWave, reorderWave, setWaveStart } from '@/controllers/wave';
import { addProduct, archiveProduct, duplicateProduct, removeProduct, renameProduct, setActiveProduct, setEditScope, setProductOffset } from '@/controllers/product';
import { clearProductOverride, setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { setPortfolioHorizon } from '@/controllers/portfolio';
import { addTeamRow, updateTeamRow } from '@/controllers/team';
import { togglePhase } from '@/controllers/scope';
import { validate } from '@/domain/portfolio';
import { docOnly, threeProducts } from '../helpers/portfolioStore';

type Op = () => void;
const pf = (s: ReturnType<typeof threeProducts>['s']) => s.getState().portfolio;
/** Operations pick products and waves by position, so they stay valid whatever earlier operations created or removed. */
const nth = <T,>(a: T[], i: number): T => a[i % a.length] as T;
const phases = ['L0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'];

/** The store of the run in progress: the operations are built once and read it when they execute. */
const cur: { t: ReturnType<typeof threeProducts> } = { t: undefined as never };
function mkOps(): fc.Arbitrary<Op> {
  const p = () => pf(cur.t.s), prod = (i: number) => nth(p().products, i).id, wave = (i: number) => (p().waves.length ? nth(p().waves, i).id : '');
  const ix = fc.nat(9);
  return fc.oneof(
    fc.record({ v: fc.integer({ min: 1, max: 60 }) }).map(({ v }): Op => () => setInput('y1Ramp', v)),
    fc.boolean().map((v): Op => () => setChecked('fitAuto', v)),
    fc.integer({ min: 0, max: 100 }).map((v): Op => () => setLifecyclePos(v)),
    fc.record({ ph: fc.constantFrom(...phases), on: fc.boolean() }).map(({ ph, on }): Op => () => togglePhase(ph, on)),
    fc.constant<Op>(() => addTeamRow()),
    fc.record({ v: fc.integer({ min: 0, max: 30 }) }).map(({ v }): Op => () => updateTeamRow(0, 'etp', v)),
    fc.constantFrom<'all' | 'product'>('all', 'product').map((sc): Op => () => setEditScope(sc)),
    ix.map((i): Op => () => setActiveProduct(prod(i))),
    fc.string({ minLength: 1, maxLength: 6 }).map((n): Op => () => { addProduct(n.trim() || 'N', wave(0) || null); }),
    ix.map((i): Op => () => { duplicateProduct(prod(i)); }),
    ix.map((i): Op => () => { removeProduct(prod(i)); }),
    fc.record({ i: ix, n: fc.string({ minLength: 1, maxLength: 6 }) }).map(({ i, n }): Op => () => { renameProduct(prod(i), n.trim() || 'R'); }),
    ix.map((i): Op => () => { archiveProduct(prod(i)); }),
    fc.record({ i: ix, m: fc.nat(12) }).map(({ i, m }): Op => () => { setProductOffset(prod(i), m); }),
    fc.record({ i: ix, v: fc.nat(100) }).map(({ i, v }): Op => () => { setProductOverride(prod(i), 'values.y1Ramp', String(v)); }),
    ix.map((i): Op => () => { clearProductOverride(prod(i), 'values.y1Ramp'); }),
    fc.record({ i: ix, c: fc.integer({ min: 0, max: 4 }) }).map(({ i, c }): Op => () => { setProductKnowledge(prod(i), { targetCC: c }); }),
    fc.nat(12).map((m): Op => () => { addWave('W', m); }),
    fc.record({ i: ix, n: fc.nat(30) }).map(({ i, n }): Op => () => { if (wave(i)) setWaveStart(wave(i), n); }),
    ix.map((i): Op => () => { if (wave(i)) renameWave(wave(i), 'Renamed' + i); }),
    fc.record({ i: ix, to: fc.nat(5) }).map(({ i, to }): Op => () => { if (wave(i)) reorderWave(wave(i), to); }),
    ix.map((i): Op => () => { if (wave(i)) removeWave(wave(i)); }),
    fc.record({ i: ix, j: fc.nat(3) }).map(({ i, j }): Op => () => { assignWave(prod(i), j === 3 ? null : wave(j)); }),
    fc.integer({ min: 12, max: 84 }).map((m): Op => () => setPortfolioHorizon(m)),
  );
}

const ops = mkOps();

describe('A6: undo/redo properties on a 3-product, 2-wave portfolio', () => {
  it('undoing everything restores the initial portfolio; redoing everything restores the final one; invariants hold throughout', () => {
    fc.assert(fc.property(fc.array(ops, { minLength: 1, maxLength: 24 }), (seq) => {
      let clock = 0;
      const t = (cur.t = threeProducts(() => (clock += 10_000))), initial = docOnly(t.s);
      for (const op of seq) {
        op();
        expect(validate(pf(t.s)).errors).toEqual([]);
        expect(pf(t.s).products.some((x) => x.id === pf(t.s).activeProductId)).toBe(true);
      }
      const final = docOnly(t.s), steps = t.s.getState().history.undo.length;
      while (t.s.undo()) { /* back */ }
      expect(docOnly(t.s)).toBe(initial);
      expect(validate(pf(t.s)).errors).toEqual([]);
      while (t.s.redo()) { /* forward */ }
      expect(docOnly(t.s)).toBe(final);
      expect(t.s.getState().history.undo.length).toBe(steps);
    }), { numRuns: 60 });
  });
  it('jumpTo reaches every intermediate state', () => {
    const jumps = fc.property(fc.array(ops, { minLength: 2, maxLength: 12 }), (seq) => {
      let clock = 0;
      const t = (cur.t = threeProducts(() => (clock += 10_000))), states = [docOnly(t.s)];
      for (const op of seq) {
        const before = t.s.getState().history.undo.length;
        op();
        if (t.s.getState().history.undo.length > before) states.push(docOnly(t.s));
      }
      for (let i = states.length - 1; i >= 0; i--) { t.s.jumpTo(i); expect(docOnly(t.s)).toBe(states[i]); }
    });
    fc.assert(jumps, { numRuns: 30 });
    // regression: this seed reached a state whose override keys came back in another order (same content)
    fc.assert(jumps, { numRuns: 1, seed: -912658740, path: '17:6:5:6:9:6:6' });
  });
  it('with scope "this product only" a case edit never writes to the common values', () => {
    fc.assert(fc.property(fc.nat(2), fc.integer({ min: 1, max: 60 }), fc.boolean(), (k, v, on) => {
      const t = threeProducts(), common = JSON.stringify(pf(t.s).common);
      setEditScope('product'); setActiveProduct(t.ids[k]!);
      setInput('y1Ramp', v); setChecked('fitAuto', on); setLifecyclePos(v);
      expect(JSON.stringify(pf(t.s).common)).toBe(common);
    }), { numRuns: 30 });
  });
});
