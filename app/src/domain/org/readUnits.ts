/** @calc-zone process-model */
import { attr, kid, kids, NS, type XDocument, type XElement } from '../process/xml';
import { isStoredTeam } from './teamDoc';
import { SOURCINGS, UNIT_TYPES, type OrgTeam, type OrgUnit, type Sourcing, type UnitType } from './types';

/**
 * The organisation elements a process document holds (§ 16.3, B0 profile): `ac:orgUnit` and `ac:team` in the `extensionElements` of the
 * `bpmn:collaboration` (BPMN definitions have no extension elements), `ac:product` / `ac:serves` in a `bpmn:process`. Memoised on the document.
 */
export const collaborationOf = (d: XDocument): XElement | undefined => kid(d.root, NS.bpmn, 'collaboration');
const orgExt = (d: XDocument): XElement | undefined => { const c = collaborationOf(d); return c ? kid(c, NS.bpmn, 'extensionElements') : undefined; };

const asType = (v: string | undefined): UnitType => ((UNIT_TYPES as readonly string[]).includes(v ?? '') ? v as UnitType : 'other');
const asSourcing = (v: string | undefined): Sourcing | undefined => ((SOURCINGS as readonly string[]).includes(v ?? '') ? v as Sourcing : undefined);

const splitList = (v: string | undefined, sep: string): string[] => (v ?? '').split(sep).map((x) => x.trim()).filter(Boolean);
function unitOf(e: XElement): OrgUnit {
  const u: OrgUnit = { id: attr(e, 'id') ?? '', name: attr(e, 'name') ?? '', type: asType(attr(e, 'type')) };
  const parent = attr(e, 'parent'), location = attr(e, 'location'), costCentre = attr(e, 'costCentre'), sourcing = asSourcing(attr(e, 'sourcing'));
  if (parent) u.parent = parent;
  if (location) u.location = location;
  if (costCentre) u.costCentre = costCentre;
  if (sourcing) u.sourcing = sourcing;
  if (attr(e, 'service') === 'true') u.service = { skills: splitList(attr(e, 'skills'), ';'), roles: splitList(attr(e, 'roles'), ' ') };
  return u;
}

/** Teams an imported document holds (not the stored teams of schema v5, `teamDoc.ts`): their lines and the products' `ac:serves` allocations. */
function teamsOf(d: XDocument, ext: XElement | undefined): OrgTeam[] {
  const serves = new Map<string, { productId: string; pct: number }[]>();
  for (const p of kids(d.root, NS.bpmn, 'process')) {
    const x = kid(p, NS.bpmn, 'extensionElements'), prod = x ? kid(x, NS.ac, 'product') : undefined;
    for (const s of prod ? kids(prod, NS.ac, 'serves') : []) {
      const t = attr(s, 'team') ?? '', list = serves.get(t) ?? [];
      list.push({ productId: attr(prod!, 'code') ?? '', pct: Number(attr(s, 'allocationPct')) || 0 });
      serves.set(t, list);
    }
  }
  return (ext ? kids(ext, NS.ac, 'team').filter((t) => !isStoredTeam(t)) : []).map((t) => {
    const id = attr(t, 'id') ?? '';
    return { id, name: attr(t, 'name') ?? id, unit: attr(t, 'unit') ?? '', shared: false, imported: true, serves: serves.get(id) ?? [],
      lines: kids(t, NS.ac, 'line').map((l) => ({ skill: attr(l, 'skill') ?? '', grade: attr(l, 'grade') ?? '', loc: attr(l, 'location') ?? '',
        etp: Number(attr(l, 'fte')) || 0, pins: (attr(l, 'pins') ?? '').split(/\s+/).filter(Boolean) })) };
  });
}

export interface StoredOrg { units: OrgUnit[]; teams: OrgTeam[] }
const memo = new WeakMap<XDocument, StoredOrg>();
export function readStoredOrg(d: XDocument): StoredOrg {
  const hit = memo.get(d);
  if (hit) return hit;
  const ext = orgExt(d), out = { units: (ext ? kids(ext, NS.ac, 'orgUnit') : []).map(unitOf), teams: teamsOf(d, ext) };
  memo.set(d, out);
  return out;
}
