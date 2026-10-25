import { describe, expect, it } from 'vitest';
import { activeArtefacts, makeCtx } from '@/domain';
import { teamWeights } from '@/domain/baseline/teamWeights';
import {
  addSharedLine, clearSharedPins, pinSharedLine, resolveProduct, runOf, sharedLineArtefacts, validate, type Portfolio,
} from '@/domain/portfolio';
import { goldenAndB, SHARED_LINE } from '../../helpers/portfolio';

const two = goldenAndB, LINE = SHARED_LINE;
const ctx = (pf: Portfolio, id: string) => makeCtx(resolveProduct(pf, id));
const arts = (pf: Portfolio) => { const c = ctx(pf, 'p1'); return activeArtefacts(c.a, c.s).map((a) => a.id); };

describe('pins on a shared line', () => {
  it('absent pins: the share row carries no pin, exactly as before', () => {
    const pf = addSharedLine(two(), LINE), row = resolveProduct(pf, 'p1').teamIn.find((r) => r.shared === 's1')!;
    expect(row.pins).toEqual([]);
    expect(pf.sharedTeam![0]).not.toHaveProperty('pins');
  });

  it('a pinned artefact leaves the auto pool of every holder and goes to its share row', () => {
    const base = addSharedLine(two(), LINE), [a1, a2] = arts(base), pf = pinSharedLine(base, 's1', [a1!, a2!], true);
    expect(pf.sharedTeam![0]!.pins).toEqual([a1, a2]);
    for (const id of ['p1', 'B']) {
      const c = ctx(pf, id), i = c.s.teamIn.findIndex((r) => r.shared === 's1'), W = teamWeights(c);
      expect(c.s.teamIn[i]!.pins).toEqual([a1, a2]);
      expect(W.pin[a1!]).toBe(i);
      const w = activeArtefacts(c.a, c.s).filter((a) => a.id === a1 || a.id === a2).reduce((s, a) => s + (+a.w || 0), 0);
      expect(W.rowW[i]).toBeCloseTo(w, 9);
    }
    expect(runOf(resolveProduct(pf, 'p1'))).not.toBe(runOf(resolveProduct(base, 'p1')));
    expect(validate(pf).errors).toEqual([]);
  });

  it('one shared line per artefact: pinning on another line moves it; unpin and clear drop the field when empty', () => {
    const base = addSharedLine(addSharedLine(two(), LINE), { ...LINE, id: 's2', allocations: { p1: 50 } }), [a1, a2] = arts(base);
    let pf = pinSharedLine(base, 's1', [a1!, a2!], true);
    pf = pinSharedLine(pf, 's2', [a1!], true);
    expect(pf.sharedTeam!.map((l) => l.pins)).toEqual([[a2], [a1]]);
    pf = pinSharedLine(pf, 's2', [a1!], false);
    expect(pf.sharedTeam![1]).not.toHaveProperty('pins');
    expect(clearSharedPins(pf, 's1').sharedTeam![0]).not.toHaveProperty('pins');
    expect(pinSharedLine(pf, 'nope', [a1!], true)).toBe(pf);
    expect(pinSharedLine(pf, 's1', [a2!, a2!], true).sharedTeam![0]!.pins).toEqual([a2]);
  });

  it('a product’s own pinned row comes first in that product', () => {
    const base = addSharedLine(two(), LINE), [a1] = arts(base);
    const own: Portfolio = { ...base, products: base.products.map((p) => (p.id === 'p1' ? { ...p, teamIn: p.teamIn.map((r, i) => (i === 0 ? { ...r, pins: [a1!] } : r)) } : p)) };
    const pf = pinSharedLine(own, 's1', [a1!], true);
    expect(teamWeights(ctx(pf, 'p1')).pin[a1!]).toBe(0);
    const b = ctx(pf, 'B');
    expect(teamWeights(b).pin[a1!]).toBe(b.s.teamIn.findIndex((r) => r.shared === 's1'));
  });

  it('pins that are not a list are an error; the artefacts offered are those of the holders', () => {
    const pf = addSharedLine(two(), { ...LINE, pins: 'A001' as unknown as string[] });
    expect(validate(pf).errors.map((e) => e.code)).toContain('shared-line');
    const ok = addSharedLine(two(), LINE);
    expect(sharedLineArtefacts(ok, LINE).map((a) => a.id)).toEqual(expect.arrayContaining(arts(ok)));
  });
});
