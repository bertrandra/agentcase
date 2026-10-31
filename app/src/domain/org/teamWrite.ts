/** @calc-zone process-model */
import type { SharedTeamLine } from '../portfolio/types';
import type { TeamRow } from '../types/state';
import { appendChild } from '../process/editTree';
import { attr, el, kids, NS, withAttrs, withChildren, type AttrInput, type XDocument, type XElement, type XNode } from '../process/xml';
import { carrier, isBlank, onCollaboration, onExtChildren, withExtChild, withoutChildren } from './orgExt';
import { DEFAULT_UNIT_ID, productTeamId, sharedTeamId } from './ids';
import { lineRow, sharedLineIn, storedTeams } from './teamDoc';

/**
 * Writes of the stored teams (schema v5, phase B10a; read side `teamDoc.ts`). Every function returns the same document when nothing changes and
 * shares every unchanged node, so the store's diff (`syncDraft`) turns an edit into node patches: one attribute, a line or a team appended at the
 * end of its list, an element removed. A missing document (an object without a process document) gets the organisation carrier.
 */
const lineAttrs = (r: Pick<TeamRow, 'skill' | 'grade' | 'loc' | 'etp' | 'pins'>, keepEmptyPins = false): AttrInput => {
  const pins = (Array.isArray(r.pins) ? r.pins : []).map(String).join(' ');
  return { skill: String(r.skill ?? ''), grade: String(r.grade ?? ''), location: String(r.loc ?? ''), fte: String(r.etp),
    pins: pins || (keepEmptyPins && r.pins ? '' : null) };
};
const lineEl = (r: TeamRow, keep = false): XElement => el('ac:line', lineAttrs(r, keep));
const sameRow = (a: TeamRow, b: TeamRow): boolean => a.skill === b.skill && a.grade === b.grade && a.loc === b.loc && Object.is(+a.etp, +b.etp)
  && (a.pins ?? []).map(String).join(' ') === (b.pins ?? []).map(String).join(' ');

/** The element with its `ac:line` children set to `rows`: equal lines kept, changed ones edited in place, extra ones appended, missing ones removed. */
function withLines(team: XElement, rows: readonly TeamRow[], keep = false): XElement {
  const cur = kids(team, NS.ac, 'line'), have = cur.map(lineRow);
  let out = team;
  const n = Math.min(cur.length, rows.length);
  if (n) {
    const map = new Map<XElement, XElement>();
    for (let i = 0; i < n; i++) {
      const e = cur[i] as XElement, r = rows[i] as TeamRow;
      if (!sameRow(have[i] as TeamRow, r)) map.set(e, withAttrs(e, lineAttrs(r, keep)));
    }
    if (map.size) out = withChildren(out, out.children.map((c) => (c.kind === 'element' && map.get(c)) || c));
  }
  if (cur.length > rows.length) {
    const gone = new Set<XNode>(cur.slice(rows.length));
    out = withChildren(out, withoutChildren(out.children, (e) => gone.has(e)));
  }
  for (const r of rows.slice(cur.length)) out = appendLine(out, lineEl(r, keep));
  return out;
}
/** A line appended before the shares of a shared team (the content model: lines, then shares). */
function appendLine(team: XElement, line: XElement): XElement {
  const share = team.children.findIndex((c) => c.kind === 'element' && c.local === 'share');
  if (share < 0) return appendChild(team, line);
  const pad = isBlank(team.children[share - 1]) ? [team.children[share - 1] as XNode] : [];
  return withChildren(team, [...team.children.slice(0, share - pad.length), ...pad, line, ...team.children.slice(share - pad.length)]);
}

/** The document with one stored team element replaced by `next` (null removes it), or `fresh` appended when the document has none. */
function onTeam(d: XDocument | undefined, cur: XElement | undefined, next: XElement | null): XDocument {
  const base = d ?? carrier();
  if (!cur) return next ? onCollaboration(base, (c) => withExtChild(c, next)) : base;
  if (next === cur) return base;
  return onCollaboration(base, (c) => onExtChildren(c, (cs) => (next ? cs.map((x) => (x === cur ? next : x)) : withoutChildren(cs, (e) => e === cur))));
}

/** A product's entry team rows written (its team element created at the end of the list when new, named "‹name› delivery team"). */
export function withProductTeam(d: XDocument | undefined, productId: string, rows: readonly TeamRow[], name?: string): XDocument {
  const cur = storedTeams(d).own.get(productId);
  if (cur) {
    const named = name !== undefined ? withAttrs(cur, { name: `${name} delivery team` }) : cur;
    return onTeam(d, cur, withLines(named, rows));
  }
  const team = el('ac:team', { id: productTeamId(productId), name: `${name ?? productId} delivery team`, unit: DEFAULT_UNIT_ID, product: productId });
  return onTeam(d, undefined, withLines(team, rows));
}
/** A product's team removed (the product is deleted). */
export const withoutProductTeam = (d: XDocument, productId: string): XDocument => onTeam(d, storedTeams(d).own.get(productId), null);

/** The owning unit of a product (D-B39): a unit id, or null for "Unassigned". Refused (same document) when the product has no team element. */
export function withOwner(d: XDocument, productId: string, unitId: string | null): XDocument {
  const cur = storedTeams(d).own.get(productId);
  return cur ? onTeam(d, cur, withAttrs(cur, { owner: unitId })) : d;
}

const shareEls = (alloc: Record<string, number>): XElement[] => Object.entries(alloc).map(([product, pct]) => el('ac:share', { product, pct: String(pct) }));
function sharedEl(cur: XElement | undefined, l: SharedTeamLine): XElement {
  const name = `Shared ${l.skill} · ${l.grade} · ${l.loc}`, row: TeamRow = { skill: l.skill, grade: l.grade, loc: l.loc, etp: l.etp, pins: l.pins };
  if (!cur) return [el('ac:line', lineAttrs(row, true)), ...shareEls(l.allocations)]
    .reduce((t, c) => appendChild(t, c), el('ac:team', { id: sharedTeamId(l.id), name, unit: DEFAULT_UNIT_ID, line: l.id }, [] as XNode[]));
  let out = withLines(withAttrs(cur, { name }), [row], true);
  const was = sharedLineIn(cur).allocations;
  if (JSON.stringify(was) !== JSON.stringify(l.allocations)) {
    out = withChildren(out, withoutChildren(out.children, (e) => e.local === 'share'));
    for (const s of shareEls(l.allocations)) out = appendChild(out, s);
  }
  return out;
}

/** The shared team lines written: unchanged lines keep their element, changed ones are edited, new ones appended, missing ones removed. */
export function withSharedLines(d: XDocument | undefined, next: readonly SharedTeamLine[]): XDocument {
  const els = storedTeams(d).shared, byId = new Map(els.map((e) => [attr(e, 'line') ?? '', e]));
  let out = d ?? carrier();
  const keep = new Set(next.map((l) => l.id));
  for (const e of els) if (!keep.has(attr(e, 'line') ?? '')) out = onTeam(out, e, null);
  for (const l of next) {
    const cur = byId.get(l.id);
    if (cur && JSON.stringify(sharedLineIn(cur)) === JSON.stringify(l)) continue;
    out = onTeam(out, storedTeams(out).shared.find((e) => attr(e, 'line') === l.id), sharedEl(cur, l));
  }
  return d && out === d ? d : out;
}
