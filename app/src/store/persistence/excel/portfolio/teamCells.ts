/** @calc-zone exports */
import { LOCATIONS } from '@/domain/catalog';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import { cleanText, str } from '../params/safe';
import { fail, type Line, type Tab } from './tab';

const LOC_NAMES = new Set(LOCATIONS.map((l) => l.name));

/** Skill, grade and location of a team row (columns B-D of the TeamIn and SharedTeam sheets): known values, or the import stops. */
export function teamCells(t: Tab, l: Line): { skill: string; grade: string; loc: string } {
  const skill = cleanText(l.c[1], 60), grade = cleanText(l.c[2], 20), loc = str(l.c[3]);
  if (!SKILLS_EXIST.includes(skill)) fail(t.name, l.n, `unknown skill "${skill.slice(0, 40)}"`);
  if (!GRADES.includes(grade)) fail(t.name, l.n, `unknown grade "${grade}"`);
  if (!LOC_NAMES.has(loc)) fail(t.name, l.n, `unknown location "${cleanText(loc, 40)}"`);
  return { skill, grade, loc };
}

/** The pinned artefacts of a row (column `i`, `;` separated; blank = none): known artefact ids, or the import stops. */
/**
 * The pins of a team row (`;`-separated): each must be one of `known()` (`pinTargets`: the portfolio's activities, custom ones included, FX-03),
 * asked only when the row has a pin (reading the process costs; most rows have none).
 */
export function pinCells(t: Tab, l: Line, i: number, known: () => ReadonlySet<string>): string[] {
  const pins = String(l.c[i] ?? '').split(';').map((p) => p.trim()).filter(Boolean);
  const k = pins.length ? known() : undefined;
  for (const p of pins) if (!k!.has(p)) fail(t.name, l.n, `unknown pinned artefact "${cleanText(p, 40)}"`);
  return pins;
}
