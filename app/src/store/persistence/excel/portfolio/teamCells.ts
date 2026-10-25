/** @calc-zone exports */
import { LOCATIONS, REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import { cleanText, str } from '../params/safe';
import { fail, type Line, type Tab } from './tab';

const LOC_NAMES = new Set(LOCATIONS.map((l) => l.name));
const KNOWN_ART = new Set([...SDLC_ARTEFACTS, ...REG_ARTEFACTS].map((a) => a.id));

/** Skill, grade and location of a team row (columns B-D of the TeamIn and SharedTeam sheets): known values, or the import stops. */
export function teamCells(t: Tab, l: Line): { skill: string; grade: string; loc: string } {
  const skill = cleanText(l.c[1], 60), grade = cleanText(l.c[2], 20), loc = str(l.c[3]);
  if (!SKILLS_EXIST.includes(skill)) fail(t.name, l.n, `unknown skill "${skill.slice(0, 40)}"`);
  if (!GRADES.includes(grade)) fail(t.name, l.n, `unknown grade "${grade}"`);
  if (!LOC_NAMES.has(loc)) fail(t.name, l.n, `unknown location "${cleanText(loc, 40)}"`);
  return { skill, grade, loc };
}

/** The pinned artefacts of a row (column `i`, `;` separated; blank = none): known artefact ids, or the import stops. */
export function pinCells(t: Tab, l: Line, i: number): string[] {
  const pins = String(l.c[i] ?? '').split(';').map((p) => p.trim()).filter(Boolean);
  for (const p of pins) if (!KNOWN_ART.has(p)) fail(t.name, l.n, `unknown pinned artefact "${cleanText(p, 40)}"`);
  return pins;
}
