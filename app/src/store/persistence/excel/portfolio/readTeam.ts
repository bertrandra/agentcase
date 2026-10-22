import { LOCATIONS, REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { snapFTE } from '@/domain/baseline/apportion';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import type { TeamRow } from '@/domain/types/state';
import { cleanText, str } from '../params/safe';
import type { Sheets } from '../params/types';
import { PF_LIMITS, PF_SHEETS } from './names';
import { fail, knownProduct, numberCell, tab } from './tab';

const LOC_NAMES = new Set(LOCATIONS.map((l) => l.name));
const KNOWN_ART = new Set([...SDLC_ARTEFACTS, ...REG_ARTEFACTS].map((a) => a.id));

/**
 * TeamIn sheet: ONE sheet, a Product column. Every row is validated (known product, known location, FTE >= 0, known pinned artefacts, a pin only once per
 * product) and a bad row stops the import, unlike the single-case "Input Team" that skips rows: a portfolio must not silently lose a team. Each product needs >= 1 row.
 */
export function readTeams(sheets: Sheets, ids: ReadonlySet<string>): Map<string, TeamRow[]> {
  const t = tab(sheets, PF_SHEETS.team);
  if (!t) return fail(PF_SHEETS.team, null, 'a portfolio workbook needs the TeamIn sheet (one team per product)');
  const out = new Map<string, TeamRow[]>(), pinned = new Map<string, Set<string>>();
  for (const l of t.lines) {
    const id = knownProduct(t, l, ids), rows = out.get(id) ?? [], seen = pinned.get(id) ?? new Set<string>();
    const skill = cleanText(l.c[1], 60), grade = cleanText(l.c[2], 20), loc = str(l.c[3]);
    if (!SKILLS_EXIST.includes(skill)) fail(t.name, l.n, `unknown skill "${skill.slice(0, 40)}"`);
    if (!GRADES.includes(grade)) fail(t.name, l.n, `unknown grade "${grade}"`);
    if (!LOC_NAMES.has(loc)) fail(t.name, l.n, `unknown location "${cleanText(loc, 40)}"`);
    const etp = snapFTE(numberCell(t, l, 4, 'FTE', { min: 0, max: 100000 }) as number);
    const pins = String(l.c[5] ?? '').split(';').map((p) => p.trim()).filter(Boolean);
    for (const p of pins) {
      if (!KNOWN_ART.has(p)) fail(t.name, l.n, `unknown pinned artefact "${cleanText(p, 40)}"`);
      if (seen.has(p)) fail(t.name, l.n, `artefact "${p}" is pinned twice in product "${id}"`);
      seen.add(p);
    }
    if (rows.length >= PF_LIMITS.teamRowsPerProduct) fail(t.name, l.n, `too many team rows for product "${id}" (limit ${PF_LIMITS.teamRowsPerProduct})`);
    rows.push({ skill, grade, loc, etp, pins });
    out.set(id, rows); pinned.set(id, seen);
  }
  for (const id of ids) if (!out.has(id)) fail(t.name, null, `product "${id}" has no team row`);
  return out;
}
