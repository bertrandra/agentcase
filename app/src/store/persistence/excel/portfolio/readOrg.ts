/** @calc-zone exports */
import { DEFAULT_UNIT_ID, SOURCINGS, UNIT_TYPES, withOwner, withUnitList, type Sourcing, type UnitInput, type UnitType } from '@/domain/org';
import type { Portfolio, SharedTeamLine } from '@/domain/portfolio';
import type { XDocument } from '@/domain/process';
import { cleanText, str } from '../params/safe';
import type { Sheets } from '../params/types';
import { PF_LIMITS, PF_SHEETS } from './names';
import { fail, flagCell, idOf, knownProduct, SAFE_ID, tab } from './tab';

/** What the Units and Owners sheets hold (each undefined when the workbook has no such sheet: an older workbook keeps the case's). */
export interface OrgSheets { units?: UnitInput[]; owners?: Map<string, string | null> }

const opt = (v: string): string | undefined => v || undefined;
const list = (v: string, sep: RegExp): string[] => v.split(sep).map((x) => x.trim()).filter(Boolean);

/**
 * Units (SPEC_FIXES FX-30): one row per unit, ids unique and safe, a known type and sourcing, a parent among the sheet's units (no cycle: checked
 * when applied), a shared service with its activity types and role ids. Owners: one row per product, a blank unit = no owner. A unit an owner
 * names must be a unit of the Units sheet (or of the case when the workbook has none): the refusal names it.
 */
export function readOrg(sheets: Sheets, ids: ReadonlySet<string>, caseUnits: ReadonlySet<string>): OrgSheets {
  const out: OrgSheets = {}, t = tab(sheets, PF_SHEETS.units);
  if (t) {
    const seen = new Set<string>();
    out.units = t.lines.map((l): UnitInput => {
      const id = idOf(t, l, 'unit id'), name = str(l.c[1]), type = str(l.c[2]), parent = str(l.c[3]), sourcing = str(l.c[6]);
      if (seen.has(id)) fail(t.name, l.n, `unit "${id}" appears twice`);
      if (seen.size >= PF_LIMITS.units) fail(t.name, l.n, `too many units (limit ${PF_LIMITS.units})`);
      seen.add(id);
      if (!name) fail(t.name, l.n, `unit "${id}" has no name`);
      if (!(UNIT_TYPES as readonly string[]).includes(type)) fail(t.name, l.n, `unit "${id}": type must be one of ${UNIT_TYPES.join(', ')}`);
      if (sourcing && !(SOURCINGS as readonly string[]).includes(sourcing)) {
        fail(t.name, l.n, `unit "${id}": sourcing must be ${SOURCINGS.join(', ')} or blank`);
      }
      if (parent && !SAFE_ID.test(parent)) fail(t.name, l.n, `unit "${id}": parent id "${cleanText(parent, 40)}" is not a valid id`);
      const service = flagCell(t, l, 7, 'Shared service') ? { skills: list(str(l.c[8]), /;/), roles: list(str(l.c[9]), /\s+/) } : undefined;
      return { id, name: cleanText(name, 200), type: type as UnitType, ...(parent ? { parent } : {}), ...(opt(str(l.c[4])) ? { location: str(l.c[4]) } : {}),
        ...(opt(str(l.c[5])) ? { costCentre: cleanText(str(l.c[5]), 80) } : {}), ...(sourcing ? { sourcing: sourcing as Sourcing } : {}),
        ...(service ? { service } : {}) };
    });
    for (const u of out.units) if (u.parent && !seen.has(u.parent)) fail(t.name, null, `unit "${u.id}": parent unit "${u.parent}" is not in the Units sheet`);
  }
  const o = tab(sheets, PF_SHEETS.owners);
  if (o) {
    const known = new Set([DEFAULT_UNIT_ID, ...(out.units ? out.units.map((u) => u.id) : caseUnits)]);
    out.owners = new Map();
    for (const l of o.lines) {
      const pid = knownProduct(o, l, ids), unit = str(l.c[1]);
      if (out.owners.has(pid)) fail(o.name, l.n, `product "${pid}" has two owners`);
      if (unit && !known.has(unit)) fail(o.name, l.n, `owner unit "${cleanText(unit, 64)}" of product "${pid}" is not a unit of the organisation`);
      out.owners.set(pid, unit || null);
    }
  }
  return out;
}

/** The portfolio with the Units sheet's units (replacing the case's) and the Owners sheet's owners; a shared line's unit must be one of them. */
export function applyOrg(pf: Portfolio, org: OrgSheets, shared: readonly SharedTeamLine[] | undefined): Portfolio {
  let d = pf.common.BPMN as XDocument;
  if (org.units) {
    const known = new Set([DEFAULT_UNIT_ID, ...org.units.map((u) => u.id)]), bad = (shared ?? []).find((l) => l.unit && !known.has(l.unit));
    if (bad) fail(PF_SHEETS.shared, null, `line "${bad.id}": unit "${bad.unit}" is not in the Units sheet`);
    d = withUnitList(d, org.units) ?? fail(PF_SHEETS.units, null, 'the units form a cycle, or a unit id is already used by another element');
  }
  for (const [pid, unit] of org.owners ?? []) d = withOwner(d, pid, unit);
  return d === pf.common.BPMN ? pf : { ...pf, common: { ...pf.common, BPMN: d } };
}
