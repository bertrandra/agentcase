/** @calc-zone exports */
import { BUILTIN_STRUCTURES, findStructure, placeIn, STANDARD_STRUCTURE, type MenuStructure } from '@/domain/nav/structures';
import { groupsByOrder } from '@/domain/pdc/personas';
import { sameJson } from '../compare';
import { blue, frz, head, sheet } from '../kit';
import { cleanText, num, okKey, safeId, str } from '../safe';
import type { ParamsDoc, ReadCtx, SheetFamily, WriteCtx } from '../types';

/**
 * Menu structures (DEV-MENU-STRUCTURES, no legacy equivalent): the standard structure stays on the Groups / Sections sheets; every other structure the
 * case stores (created, or a built-in once edited) gets its groups on "Menu Structures" and the group + order of every section on "Menu Structure
 * Sections". Both sheets are written only when the case stores such a structure, so a case without one exports the legacy sheet list unchanged.
 */
const stored = (d: ParamsDoc): MenuStructure[] => (d.MENU_STRUCTURES ?? []) as MenuStructure[];
const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The structures the workbook carries: the ones the case stores (an unedited built-in comes with the app, a persona names it by id). */
export const structuresToWrite = (d: ParamsDoc): MenuStructure[] => stored(d).filter((s) => s.id !== STANDARD_STRUCTURE);

function write({ wb, d, secs }: WriteCtx): void {
  const list = structuresToWrite(d);
  if (!list.length) return;
  const gs = sheet(wb, 'Menu Structures', [['Structure ID', 18], ['Structure Label', 24], ['Group ID', 16], ['Group Label', 24], ['Order', 8], ['Description', 70], ['Color', 12]]);
  list.forEach((st) => groupsByOrder(st.groups).forEach((g) => { const r = gs.addRow([st.id, st.label, g.id, g.label, g.order, g.description || '', st.colors[g.id] ?? '']); [4, 5, 6, 7].forEach((i) => blue(r.getCell(i))); }));
  head(gs); frz(gs);
  const ss = sheet(wb, 'Menu Structure Sections', [['Structure ID', 18], ['Section ID', 18], ['Group', 16], ['Group Seq', 11]]);
  list.forEach((st) => placeIn(secs.map((s) => ({ ...s })), st).forEach((s) => { const r = ss.addRow([st.id, s.id, s.group, s.groupSeq || 0]); [3, 4].forEach((i) => blue(r.getCell(i))); }));
  head(ss); frz(ss);
}

/** A structure named on the sheets replaces the case's copy (built from it, or from the built-in); one identical to its built-in is not stored. */
function read({ rows, w, notes, hasSection }: ReadCtx): void {
  const gr = rows('Menu Structures'); if (!gr) return;
  const by = new Map<string, MenuStructure>(), base = (id: string) => findStructure(id, stored(w));
  gr.slice(1).forEach((x) => {
    const id = safeId(x[0]), gid = safeId(x[2]);
    if (!id || !gid || id === STANDARD_STRUCTURE || !okKey(gid)) return;
    let st = by.get(id);
    if (!st) { const b = base(id); st = { id, label: cleanText(x[1]) || id, groups: [], colors: {}, placement: { ...(b?.placement ?? {}) } }; by.set(id, st); }
    const ord = num(x[4]);
    st.groups.push({ id: gid, label: cleanText(x[3]) || gid, order: Number.isNaN(ord) ? st.groups.length + 1 : ord, description: cleanText(x[5], 500) });
    if (hex.test(str(x[6]))) st.colors[gid] = str(x[6]);
  });
  (rows('Menu Structure Sections') ?? []).slice(1).forEach((x) => {
    const st = by.get(safeId(x[0])), sid = str(x[1]), grp = safeId(x[2]), seq = num(x[3]);
    if (!st || !sid || !hasSection(sid) || !okKey(sid)) return;
    if (!st.groups.some((g) => g.id === grp)) { notes.push(`Menu Structure Sections: "${cleanText(sid, 60)}" names the unknown group "${grp}" of ${st.id} — row skipped.`); return; }
    st.placement[sid] = { group: grp, groupSeq: Number.isNaN(seq) ? 0 : seq };
  });
  let list = stored(w).filter((s) => !by.has(s.id));
  by.forEach((st) => { const b = BUILTIN_STRUCTURES.find((x) => x.id === st.id); if (!b || !sameJson(b, st)) list = [...list, st]; });
  if (list.length || w.MENU_STRUCTURES) w.MENU_STRUCTURES = list;
}

export const menuStructures: SheetFamily = { sheets: ['Menu Structures', 'Menu Structure Sections'], write, read };
