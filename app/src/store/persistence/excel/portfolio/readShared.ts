/** @calc-zone exports */
import type { SharedTeamLine } from '@/domain/portfolio';
import { cleanText, str } from '../params/safe';
import type { Sheets } from '../params/types';
import { PF_LIMITS, PF_SHEETS } from './names';
import { fail, idOf, numberCell, SAFE_ID, tab, type Line, type Tab } from './tab';
import { pinCells, teamCells } from './teamCells';

/** The pinned artefacts of a row (column H, blank = none): known artefacts, each once. */
function pinsOf(t: Tab, l: Line): string[] {
  const pins = pinCells(t, l, 7);
  pins.forEach((p, i) => { if (pins.indexOf(p) !== i) fail(t.name, l.n, `artefact "${p}" is pinned twice`); });
  return pins;
}

/** The unit (column I, blank = the delivery unit) and split rule (column J: "effort", blank = fixed shares) of a line (B10c; absent in older files). */
function serviceOf(t: Tab, l: Line): Pick<SharedTeamLine, 'unit' | 'split'> {
  const unit = str(l.c[8]), split = str(l.c[9]);
  if (unit && !SAFE_ID.test(unit)) fail(t.name, l.n, `unit id "${cleanText(unit, 40)}" must be 1-64 letters, digits, "_" or "-"`);
  if (split && split !== 'effort') fail(t.name, l.n, `split must be "effort" or blank (got "${cleanText(split, 20)}")`);
  return { ...(unit ? { unit } : {}), ...(split ? { split: 'effort' as const } : {}) };
}

function lineOf(t: Tab, l: Line, id: string): SharedTeamLine {
  const { skill, grade, loc } = teamCells(t, l), pins = pinsOf(t, l);
  return { id, skill, grade, loc, etp: numberCell(t, l, 4, 'FTE', { min: 0, max: 100000 }) as number, allocations: {}, ...(pins.length ? { pins } : {}),
    ...serviceOf(t, l) };
}

/**
 * SharedTeam sheet (optional; absent = no shared line): one row per share, rows of a line share its id and repeat its skill, grade, location,
 * FTE and pins (they must agree). Pins (column H, optional: an older workbook has none) are known artefact ids. A blank product id keeps a line
 * without any share. Shares are percentages in [0, 100] of known products, one per product.
 */
export function readShared(sheets: Sheets, ids: ReadonlySet<string>): SharedTeamLine[] | undefined {
  const t = tab(sheets, PF_SHEETS.shared);
  if (!t) return undefined;
  const out = new Map<string, SharedTeamLine>();
  for (const l of t.lines) {
    const id = idOf(t, l, 'line id'), line = lineOf(t, l, id), cur = out.get(id);
    const samePins = (cur?.pins ?? []).join(';') === (line.pins ?? []).join(';');
    if (cur && (cur.skill !== line.skill || cur.grade !== line.grade || cur.loc !== line.loc || cur.etp !== line.etp || !samePins
      || cur.unit !== line.unit || cur.split !== line.split)) {
      fail(t.name, l.n, `line "${id}" repeats with another skill, grade, location, FTE, pins, unit or split`);
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
