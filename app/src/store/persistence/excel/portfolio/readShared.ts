/** @calc-zone exports */
import { LOCATIONS } from '@/domain/catalog';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import type { SharedTeamLine } from '@/domain/portfolio';
import { cleanText, str } from '../params/safe';
import type { Sheets } from '../params/types';
import { PF_LIMITS, PF_SHEETS } from './names';
import { fail, idOf, numberCell, tab, type Line, type Tab } from './tab';

const LOC_NAMES = new Set(LOCATIONS.map((l) => l.name));

function lineOf(t: Tab, l: Line, id: string): SharedTeamLine {
  const skill = cleanText(l.c[1], 60), grade = cleanText(l.c[2], 20), loc = str(l.c[3]);
  if (!SKILLS_EXIST.includes(skill)) fail(t.name, l.n, `unknown skill "${skill.slice(0, 40)}"`);
  if (!GRADES.includes(grade)) fail(t.name, l.n, `unknown grade "${grade}"`);
  if (!LOC_NAMES.has(loc)) fail(t.name, l.n, `unknown location "${cleanText(loc, 40)}"`);
  return { id, skill, grade, loc, etp: numberCell(t, l, 4, 'FTE', { min: 0, max: 100000 }) as number, allocations: {} };
}

/**
 * SharedTeam sheet (optional; absent = no shared line): one row per share, rows of a line share its id and repeat its skill, grade, location and
 * FTE (they must agree). A blank product id keeps a line without any share. Shares are percentages in [0, 100] of known products, one per product.
 */
export function readShared(sheets: Sheets, ids: ReadonlySet<string>): SharedTeamLine[] | undefined {
  const t = tab(sheets, PF_SHEETS.shared);
  if (!t) return undefined;
  const out = new Map<string, SharedTeamLine>();
  for (const l of t.lines) {
    const id = idOf(t, l, 'line id'), line = lineOf(t, l, id), cur = out.get(id);
    if (cur && (cur.skill !== line.skill || cur.grade !== line.grade || cur.loc !== line.loc || cur.etp !== line.etp)) {
      fail(t.name, l.n, `line "${id}" repeats with another skill, grade, location or FTE`);
    }
    if (!cur && out.size >= PF_LIMITS.sharedLines) fail(t.name, l.n, `too many shared lines (limit ${PF_LIMITS.sharedLines})`);
    const into = cur ?? line;
    out.set(id, into);
    if (str(l.c[5]) === '') continue;
    const pid = str(l.c[5]);
    if (!ids.has(pid)) fail(t.name, l.n, `unknown product "${cleanText(pid, 64)}" (not in the Products sheet)`);
    if (Object.hasOwn(into.allocations, pid)) fail(t.name, l.n, `product "${pid}" has two shares of line "${id}"`);
    into.allocations[pid] = numberCell(t, l, 6, 'Share %', { min: 0, max: 100 }) as number;
  }
  return out.size ? [...out.values()] : undefined;
}
