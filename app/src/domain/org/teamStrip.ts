/** @calc-zone process-model */
import { memoChain } from '../portfolio/memo';
import { kid, NS, type XDocument, type XElement, type XNode } from '../process/xml';
import { isCarrier, onCollaboration, onExtChildren, orgExtOf, withExtChild } from './orgExt';
import { isStoredTeam } from './teamDoc';

/**
 * The split of a case's document into its parts (docs/SPEC_BPMN.md § 21, phase B10a, the override split of § 16.8 / § 19.13):
 * - `withoutTeams`: the document a product's case runs on — the process (activities, phases, scope, RACI), the units and the programme values,
 *   WITHOUT the stored teams (they reach the case as its entry team, `teamIn`). It keeps its identity while only teams change (interned on every
 *   other node), so editing one product's team never invalidates another product's resolved case (the per-product memo of § 10);
 * - `withoutOrg`: a product's own process document (a whole-document override, F-B20) keeps no copy of the organisation (units, stored teams);
 * - `withTeamsOf`: a document with the stored teams of another one (the common document after a process edit, an import or an editor save).
 */
const collab = (d: XDocument): XElement | undefined => kid(d.root, NS.bpmn, 'collaboration');
const isUnit = (e: XElement): boolean => e.ns === NS.ac && e.local === 'orgUnit';
const isOrg = (e: XElement): boolean => isStoredTeam(e) || isUnit(e);

function dropping(d: XDocument, drop: (e: XElement) => boolean): XDocument {
  return onCollaboration(d, (c) => onExtChildren(c, (cs) => {
    if (!cs.some((x) => x.kind === 'element' && drop(x))) return cs;
    const out: XNode[] = [];
    for (const x of cs) {
      if (x.kind === 'element' && drop(x)) { const p = out[out.length - 1]; if (p?.kind === 'text' && !p.text.trim()) out.pop(); continue; }
      out.push(x);
    }
    return out;
  }));
}

const MARK = {}, interned = new WeakMap<object, unknown>(), direct = new WeakMap<XDocument, XDocument | null>();
/** The stripped document interned on the identity of every node it keeps along the changed path (root, collaboration, extension elements). */
function intern(s: XDocument): XDocument {
  const c = kid(s.root, NS.bpmn, 'collaboration'), x = c ? kid(c, NS.bpmn, 'extensionElements') : undefined;
  const keys: object[] = [s.root.attrs, ...s.root.children.map((n) => (n === c ? MARK : n))];
  if (c) keys.push(c.attrs, ...c.children.map((n) => (n === x ? MARK : n)));
  if (x) keys.push(x.attrs, ...x.children);
  const leaf = [s.decl, s.before, s.after, s.root.prefix, s.root.local, s.root.children.length, c?.children.length ?? -1, x?.children.length ?? -1].join('|');
  return memoChain(interned, keys, leaf, () => s);
}

/** The document without its stored teams (undefined for an organisation carrier: the object has no process document). Interned. */
export function withoutTeams(d: XDocument | undefined): XDocument | undefined {
  if (!d?.root) return d;
  let hit = direct.get(d);
  if (hit === undefined) {
    if (isCarrier(d)) hit = null;
    else { const s = dropping(d, isStoredTeam); hit = s === d ? d : intern(s); }
    direct.set(d, hit);
  }
  return hit ?? undefined;
}

/** The document without its units (the parameters workbook's Units sheet replaces them, FX-30). */
export const withoutUnits = (d: XDocument): XDocument => dropping(d, isUnit);

/** A product's own process document: no units, no stored teams (the organisation is the common document's). */
export const withoutOrg = (d: XDocument): XDocument => dropping(d, isOrg);

/** The stored team elements of a document, in document order. */
export function storedTeamElements(d: XDocument | undefined): XElement[] {
  const x = orgExtOf(d);
  return x ? x.children.filter((n): n is XElement => n.kind === 'element' && isStoredTeam(n)) : [];
}
/** The unit elements of a document, in document order. */
export function unitElements(d: XDocument | undefined): XElement[] {
  const x = orgExtOf(d);
  return x ? x.children.filter((n): n is XElement => n.kind === 'element' && isUnit(n)) : [];
}

/** `next` with the stored teams of `from` (its own ones replaced), appended at the end of the extension elements. */
export function withTeamsOf(next: XDocument, from: XDocument | undefined): XDocument {
  const want = storedTeamElements(from), have = storedTeamElements(next);
  if (want.length === have.length && want.every((e, i) => e === have[i])) return next;
  // the usual case: the collaboration was not edited — the stored one (teams included) is put back as it is
  const s = withoutTeams(from), cs = s && collab(s), cn = collab(next), cf = from && collab(from);
  if (cs && cf && cn === cs) return { ...next, root: { ...next.root, children: next.root.children.map((x) => (x === cn ? cf : x)) } };
  let out = have.length ? dropping(next, isStoredTeam) : next;
  for (const t of want) out = onCollaboration(out, (c) => withExtChild(c, t));
  return out;
}
/** `next` with these unit elements appended (units a product's own document held that the common document lacks, by id). */
export function withUnits(next: XDocument, units: readonly XElement[]): XDocument {
  let out = next;
  for (const u of units) out = onCollaboration(out, (c) => withExtChild(c, u, isStoredTeam));
  return out;
}

/** `next` (a product's own process document, an import) as the common document: the organisation of `from` (its units and teams) laid in it. */
export function withOrgOf(next: XDocument, from: XDocument | undefined): XDocument {
  return withTeamsOf(withUnits(withoutOrg(next), unitElements(from)), from);
}
