import fc from 'fast-check';
import { expect } from 'vitest';
import { effectiveTeam, resolveProduct, validate } from '@/domain/portfolio';
import type { AppStore } from '@/store/core';
import { docOnly } from './portfolioStore';

/**
 * The undo / redo property of the organisation commands (B10a teams and units, B10c services): from the store `make` builds, a random sequence of
 * `ops`; after each one the portfolio is valid and every product's case runs on its effective team; a command that changed the document is one
 * undo step whose patches `allowed` accepts; undo restores the state before the step (a coalesced edit extends it), redo the state after.
 */
export type TeamOp = (s: AppStore) => void;

/** The portfolio's teams agree with every product's case (the engine's entry team is the document's). */
export function consistentTeams(s: AppStore): void {
  const p = s.getState().portfolio;
  expect(validate(p).errors).toEqual([]);
  for (const x of p.products) expect(resolveProduct(p, x.id).teamIn).toBe(effectiveTeam(p, x));
}

export function expectUndoProperty(make: () => AppStore, ops: fc.Arbitrary<TeamOp>[], allowed: (path: (string | number)[]) => boolean): void {
  fc.assert(fc.property(fc.array(fc.oneof(...ops), { minLength: 1, maxLength: 10 }), (seq) => {
    const s = make();
    let stepStart = docOnly(s);
    for (const op of seq) {
      const before = docOnly(s), n = s.getState().history.undo.length, top = s.getState().history.undo.at(-1);
      op(s);
      consistentTeams(s);
      const after = docOnly(s), h = s.getState().history.undo;
      if (h.length === n && h.at(-1) === top) { expect(after).toBe(before); continue; }   // refused, or view state: the document did not move
      if (h.length !== n) stepStart = before;
      expect(h.at(-1)!.patches.every((x) => allowed(x.path))).toBe(true);
      s.undo(); expect(docOnly(s)).toBe(stepStart); consistentTeams(s);
      s.redo(); expect(docOnly(s)).toBe(after); consistentTeams(s);
    }
  }), { numRuns: 30 });
}
