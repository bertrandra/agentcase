/** @calc-zone product-resolution */
import { ownerIn, productRowsIn, sharedLineIn, storedTeams } from '../org/teamDoc';
import { withoutTeams } from '../org/teamStrip';
import { withOwner, withoutProductTeam, withProductTeam, withSharedLines } from '../org/teamWrite';
import type { XDocument } from '../process/xml';
import type { TeamRow } from '../types/state';
import { memoChain } from './memo';
import type { CommonCase, Portfolio, SharedTeamLine } from './types';

/**
 * THE ACCESSOR of the teams (schema v5, docs/SPEC_BPMN.md § 21, phase B10a): a product's entry team, the shared team lines and a product's owning
 * unit are read from the organisation part of the COMMON document (`domain/org/teamDoc.ts`), never from a key. Memoised on the elements, so
 * editing one product's team gives the other products the very same rows (their resolved cases are not rebuilt).
 */
type WithCommon = Pick<Portfolio, 'common'>;
const docOf = (pf: WithCommon): XDocument | undefined => pf.common.BPMN as XDocument | undefined;

/** A product's own entry team (the rows of its team; an empty list for an unknown product). */
export const productTeam = (pf: WithCommon, productId: string): TeamRow[] => productRowsIn(docOf(pf), productId);
/** The owning unit of a product (D-B39), undefined when unassigned. */
export const productOwner = (pf: WithCommon, productId: string): string | undefined => ownerIn(docOf(pf), productId);

const NONE: SharedTeamLine[] = [], lineRoots = new WeakMap<object, unknown>();
/** The team lines shared between products, in document order (the same array while their elements are the same). */
export function sharedLines(pf: WithCommon): SharedTeamLine[] {
  const els = storedTeams(docOf(pf)).shared;
  return els.length ? memoChain(lineRoots, [...els], 'lines', () => els.map(sharedLineIn)) : NONE;
}

/** The portfolio with its common document rebuilt by `fn` (the same portfolio when nothing changes). */
export function withTeamDoc<T extends Portfolio>(pf: T, fn: (d: XDocument | undefined) => XDocument): T {
  const cur = docOf(pf), next = fn(cur);
  return next === cur ? pf : { ...pf, common: { ...pf.common, BPMN: next } };
}
export const withProductRows = <T extends Portfolio>(pf: T, productId: string, rows: readonly TeamRow[], name?: string): T =>
  withTeamDoc(pf, (d) => withProductTeam(d, productId, rows, name));
export const withoutProductRows = <T extends Portfolio>(pf: T, productId: string): T =>
  withTeamDoc(pf, (d) => (d ? withoutProductTeam(d, productId) : (d as unknown as XDocument)));
export const withLinesDoc = <T extends Portfolio>(pf: T, lines: readonly SharedTeamLine[]): T => withTeamDoc(pf, (d) => withSharedLines(d, lines));
export const withProductOwner = <T extends Portfolio>(pf: T, productId: string, unitId: string | null): T =>
  withTeamDoc(pf, (d) => (d ? withOwner(d, productId, unitId) : (d as unknown as XDocument)));

const commons = new WeakMap<object, CommonCase>(), stable = new WeakMap<object, unknown>(), NO_DOC = {};
/**
 * The common values a product's case is resolved from: the common document without its stored teams (`withoutTeams`), the other keys as they are.
 * The same object while only teams change (interned on every other value), so the resolve memo keeps every other product's case.
 */
export function processCommon(common: CommonCase): CommonCase {
  const hit = commons.get(common);
  if (hit) return hit;
  const doc = common.BPMN as XDocument | undefined, stripped = withoutTeams(doc);
  let out = common;
  if (stripped !== doc) {
    const objs: object[] = [stripped ?? NO_DOC], prims: unknown[] = [];
    for (const [k, v] of Object.entries(common)) if (k !== 'BPMN') { if (v && typeof v === 'object') { objs.push(v); prims.push(k); } else prims.push(k, v); }
    out = memoChain(stable, objs, JSON.stringify(prims), () => {
      const o: Record<string, unknown> = { ...common };
      if (stripped) o.BPMN = stripped; else delete o.BPMN;
      return o as unknown as CommonCase;
    });
  }
  commons.set(common, out);
  return out;
}
