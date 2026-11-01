/** @calc-zone process-model */
import { attr, el, kids, NS, type XDocument, type XElement } from '../process/xml';
import { onCollaboration, onExtChildren, orgExtOf, withExtChild, withoutChildren } from './orgExt';
import { teamSharesOf } from './readRaci';
import { isStoredTeam } from './teamDoc';
import type { ActivityRaci, Raci } from './types';

/**
 * A product's own RACI without a copy of the process (SPEC_FIXES FX-D4 (a), § 21.5): `ac:raciOverride product activity responsible accountable
 * consulted informed teams` in the organisation part of the common document. The product's activities read it in place of the process's RACI;
 * the role that prices the activity stays Responsible (no figure moves). Removed with the product's choice "back to the common RACI".
 */
const list = (v: string | undefined): string[] => (v ?? '').split(/\s+/).filter(Boolean);
const isOverride = (e: XElement): boolean => e.ns === NS.ac && e.local === 'raciOverride';
const ID = /^[A-Za-z0-9_.:-]{1,80}$/;

/** The overrides of a product, by activity id. */
export function raciOverridesOf(common: XDocument | undefined, productId: string): Map<string, Raci> {
  const out = new Map<string, Raci>(), x = orgExtOf(common);
  for (const e of x ? kids(x, NS.ac, 'raciOverride') : []) {
    if (attr(e, 'product') !== productId) continue;
    const r: Raci = { R: list(attr(e, 'responsible')), C: list(attr(e, 'consulted')), I: list(attr(e, 'informed')) }, A = attr(e, 'accountable');
    if (A) r.A = A;
    const teams = teamSharesOf(attr(e, 'teams'));
    if (teams) r.teams = teams;
    out.set(attr(e, 'activity') ?? '', r);
  }
  return out;
}

/** The common document with the product's override of an activity set (`raci`) or removed (null). Refused (same document) for a bad id. */
export function withRaciOverride(common: XDocument, productId: string, activityId: string, raci: Raci | null): XDocument {
  if (!ID.test(productId) || !ID.test(activityId) || (raci && !raci.R.length)) return common;
  const mine = (e: XElement) => isOverride(e) && attr(e, 'product') === productId && attr(e, 'activity') === activityId;
  const dropped = onCollaboration(common, (c) => onExtChildren(c, (cs) => withoutChildren(cs, mine)));
  if (!raci) return dropped;
  const teams = raci.teams ? Object.entries(raci.teams).map(([t, p]) => `${t}:${p}`).join(' ') : '';
  const e = el('ac:raciOverride', { product: productId, activity: activityId, responsible: raci.R.join(' '), accountable: raci.A,
    consulted: raci.C.join(' ') || null, informed: raci.I.join(' ') || null, teams: teams || null });
  return onCollaboration(dropped, (c) => withExtChild(c, e, isStoredTeam));
}

/** The activities as a product sees them: its overrides in place of the process's RACI, the pricing role kept Responsible. */
export function withProductRaci(acts: readonly ActivityRaci[], over: ReadonlyMap<string, Raci>): ActivityRaci[] {
  if (!over.size) return acts as ActivityRaci[];
  return acts.map((a) => {
    const o = over.get(a.id);
    if (!o) return a;
    const R = [...new Set([...(a.primary ? [a.primary] : []), ...o.R])];
    return { ...a, raci: { ...o, R }, source: 'explicit', accountableToConfirm: false, accountables: o.A ? 1 : 0 };
  });
}
