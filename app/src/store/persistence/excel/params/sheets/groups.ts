import { groupColor as navGroupColor } from '@/domain/nav/layout';
import { groupsByOrder } from '@/domain/pdc/personas';
import { blue, frz, grey, head, listDV, sheet } from '../kit';
import { cleanText, okKey, num, safeId, str } from '../safe';
import type { ParamsDoc, ReadCtx, SheetFamily, WriteCtx } from '../types';

const groupColor = (d: ParamsDoc, id: string): string => navGroupColor(d.GROUP_COLORS, id);
const nextOrder = (w: ParamsDoc): number => Math.max(0, ...w.GROUPS.map((x) => x.order)) + 1;

function writeGroups({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Groups', [['ID', 14], ['Label', 20], ['Order', 8], ['Description', 70], ['Color', 12]]);
  groupsByOrder(d.GROUPS).forEach((g) => { const row = ws.addRow([g.id, g.label, g.order, g.description || '', groupColor(d, g.id)]); [3, 4, 5].forEach((i) => blue(row.getCell(i))); });
  head(ws); frz(ws);
}
/** A row whose id is not known yet creates that group; colours are merged into the colour map. */
function readGroups({ rows, w, notes }: ReadCtx): void {
  const r = rows('Groups'); if (!r) return;
  const colorCol = (r[0] ?? []).map((h) => str(h).toLowerCase()).indexOf('color'), colors = { ...w.GROUP_COLORS };
  r.slice(1).forEach((x) => {
    const id = safeId(x[0]); if (!id) return;
    const label = cleanText(x[1]) || id, ord = num(x[2]), desc = cleanText(x[3], 500);
    const g = w.GROUPS.find((e) => e.id === id);
    if (!g) {
      w.GROUPS.push({ id, label, order: Number.isNaN(ord) ? nextOrder(w) : ord, description: desc });
      notes.push(`Groups: created new group "${id}" ("${label}") from the sheet.`);
    } else { if (label) g.label = label; if (!Number.isNaN(ord)) g.order = ord; g.description = desc; }
    if (colorCol >= 0 && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(str(x[colorCol])) && okKey(id)) colors[id] = str(x[colorCol]);
  });
  w.GROUP_COLORS = colors;
}

function writeSections({ wb, d, secs }: WriteCtx): void {
  const ws = sheet(wb, 'Sections', [['ID', 16], ['Label', 30], ['Group', 14], ['Group Seq', 11], ['Tag', 16], ['MVP', 7], ['Description', 60]]);
  const gids = d.GROUPS.map((g) => g.id);
  secs.forEach((s) => {
    const row = ws.addRow([s.id, s.label, s.group, s.groupSeq || 0, s.tag || '', s.mvp ? 'Yes' : '', s.description || '']);
    [3, 4, 5, 6].forEach((i) => blue(row.getCell(i))); grey(row.getCell(7));
    row.getCell(3).dataValidation = listDV(gids, `Pick a group id: ${gids.join(', ')}`);
    row.getCell(5).dataValidation = listDV(['drives', 'shapes', 'reads', 'supports', 'supports,shapes'], 'Build-path tag: drives / shapes / reads / supports (blank = none)');
    row.getCell(6).dataValidation = listDV(['Yes', ''], 'MVP (Fast Path) member: Yes or blank');
  });
  head(ws); frz(ws);
}
/** Every section's group + order within the group (global, not per persona); Tag/MVP are located by header (older workbooks lack them). */
function readSections({ rows, w, notes, secs }: ReadCtx): void {
  const r = rows('Sections'); if (!r) return;
  const hdr = (r[0] ?? []).map((h) => str(h).toLowerCase()), tagCol = hdr.indexOf('tag'), mvpCol = hdr.indexOf('mvp');
  r.slice(1).forEach((x) => {
    const id = str(x[0]); if (!id) return;
    const s = secs.find((e) => e.id === id);
    if (!s) { notes.push(`Sections: unknown section id "${cleanText(id, 60)}" — row skipped.`); return; }
    const grp = safeId(x[2]);
    if (grp) {
      if (!w.GROUPS.some((g) => g.id === grp)) { w.GROUPS.push({ id: grp, label: grp, order: nextOrder(w) }); notes.push(`Sections: created new group "${grp}" (referenced by "${id}", missing from the Groups sheet).`); }
      s.group = grp;
    }
    const seq = num(x[3]); if (!Number.isNaN(seq)) s.groupSeq = seq;
    if (tagCol >= 0) { const tg = str(x[tagCol]).toLowerCase().replace(/[^a-z0-9,_ -]/g, '').slice(0, 40); if (tg) s.tag = tg; else delete s.tag; }
    if (mvpCol >= 0) { if (/^(yes|true|1|x)$/.test(str(x[mvpCol]).toLowerCase())) s.mvp = true; else delete s.mvp; }
  });
}

export const groups: SheetFamily = { sheets: ['Groups'], write: writeGroups, read: readGroups };
export const sections: SheetFamily = { sheets: ['Sections'], write: writeSections, read: readSections };
