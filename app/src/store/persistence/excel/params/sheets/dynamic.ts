import type { BoardCard, BoardRow, DynSection } from '@/domain/pdc/board';
import { VARIABLES } from '@/domain/pdc/variables';
import { blue, frz, grey, head, listDV, sheet, ynDV } from '../kit';
import { cleanText, num, safeId, str } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

const FORMAT_IDS = ['EUR_K', 'EUR_M', 'PCT', 'INT', 'DEC1', 'DEC2', 'RATIO', 'DAYS', 'BOOL', 'TEXT'];
type Row = BoardRow & { id?: string; source?: string };
const rowsOf = (d: DynSection): Row[] => (d.rows ?? []) as Row[];

function writeSections({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Dynamic Sections', [['ID', 18], ['Title', 26], ['Template', 11], ['Group', 12], ['Order', 8], ['Visible', 9], ['Description', 50]]);
  const gids = d.GROUPS.map((g) => g.id);
  d.dynamicSections.forEach((s) => {
    const row = ws.addRow([s.id, s.title, s.archetype, s.menuGroup, s.order, s.visible !== false ? 'Yes' : 'No', s.description || '']);
    grey(row.getCell(1)); grey(row.getCell(3)); [2, 4, 5, 6, 7].forEach((i) => blue(row.getCell(i)));
    row.getCell(4).dataValidation = listDV(gids, `Group id: ${gids.join(', ')}`); row.getCell(6).dataValidation = ynDV();
  });
  head(ws); frz(ws);
}
const CARD_COLS: [string, number][] = [['Section ID', 18], ['Card ID', 22], ['Enabled', 9], ['Name', 20], ['Impact Var', 16], ['Impact Fmt', 11], ['Key1 Var', 16], ['Key1 Fmt', 11], ['Key2 Var', 16], ['Key2 Fmt', 11], ['Overlay', 16], ['Source Section', 16], ['Target Section', 16], ['Key1 Label', 20], ['Key2 Label', 20], ['Seq', 7]];
function writeCards({ wb, d, secs }: WriteCtx): void {
  const ws = sheet(wb, 'Dynamic Section Cards', CARD_COLS), vars = VARIABLES.map((v) => v.id), sids = secs.map((s) => s.id);
  d.dynamicSections.forEach((s) => (s.cards || []).forEach((c) => {
    const row = ws.addRow([s.id, c.CARD_ID, c.CARD_ENABLED ? 'Yes' : 'No', c.CARD_NAME_VALUE || '', c.CARD_IMPACT_VAR || '', c.CARD_IMPACT_FMT || '', c.CARD_KEY1_VAR || '', c.CARD_KEY1_FMT || '',
      c.CARD_KEY2_VAR || '', c.CARD_KEY2_FMT || '', c.CARD_OVERLAY_CTRL || '', c.CARD_SOURCE_SECTION || '', c.CARD_TARGET_SECTION || '', c.CARD_KEY1_LABEL || '', c.CARD_KEY2_LABEL || '', c.CARD_SEQ || 0]);
    grey(row.getCell(1)); for (let i = 2; i <= 16; i++) blue(row.getCell(i));
    row.getCell(3).dataValidation = ynDV();
    [5, 7, 9].forEach((i) => { row.getCell(i).dataValidation = listDV(vars, 'Variable id (blank = unbound)'); row.getCell(i + 1).dataValidation = listDV(FORMAT_IDS, 'Format id (blank = auto)'); });
    row.getCell(12).dataValidation = listDV(sids, 'Section id'); row.getCell(13).dataValidation = listDV(sids, 'Section id');
  }));
  head(ws); frz(ws);
}
function writeRows({ wb, d, secs }: WriteCtx): void {
  const ws = sheet(wb, 'Dynamic Section Rows', [['Section ID', 18], ['Row ID', 22], ['Seq', 7], ['Label', 26], ['Var', 16], ['Format', 10], ['Default Value', 16], ['Source Section', 16]]);
  const vars = VARIABLES.map((v) => v.id), sids = secs.map((s) => s.id);
  d.dynamicSections.forEach((s) => rowsOf(s).forEach((r) => {
    const row = ws.addRow([s.id, r.id ?? '', r.seq || 0, r.label || '', r.var || '', r.format || '', r.defaultValue != null ? String(r.defaultValue) : '', r.source || s.id]);
    grey(row.getCell(1)); grey(row.getCell(2)); for (let i = 3; i <= 8; i++) blue(row.getCell(i));
    row.getCell(5).dataValidation = listDV(vars, 'Variable id (blank = static default)'); row.getCell(6).dataValidation = listDV(FORMAT_IDS, 'Format id'); row.getCell(8).dataValidation = listDV(sids, 'Section id — scopes the Var picker');
  }));
  head(ws); frz(ws);
}

/** Edits Title/Group/Order/Visible/Description of an EXISTING dynamic section only (a card set cannot be authored as one flat row). */
function readSections({ rows, w, notes, secs }: ReadCtx): void {
  const r = rows('Dynamic Sections'); if (!r) return;
  r.slice(1).forEach((x) => {
    const id = str(x[0]); if (!id) return;
    const d = w.dynamicSections.find((e) => e.id === id), s = secs.find((e) => e.id === id);
    if (!d || !s) { notes.push(`Dynamic Sections: unknown section id "${cleanText(id, 60)}" — row skipped (create it from the Board tab first).`); return; }
    const title = cleanText(x[1], 120); if (title) { d.title = title; s.label = `🗂️ ${title}`; }
    const grp = safeId(x[3]); if (grp && w.GROUPS.some((g) => g.id === grp)) { d.menuGroup = grp; s.group = grp; }
    const ord = num(x[4]); if (!Number.isNaN(ord)) { d.order = ord; s.groupSeq = ord; }
    d.visible = !/^n/i.test(String(x[5] || ''));
    d.description = cleanText(x[6], 500);
  });
}
function readCards({ rows, w, notes, hasSection }: ReadCtx): void {
  const r = rows('Dynamic Section Cards'); if (!r) return;
  const known = new Set(VARIABLES.map((v) => v.id));
  r.slice(1).forEach((x) => {
    const sid = str(x[0]), cid = safeId(x[1]); if (!sid || !cid) return;
    const d = w.dynamicSections.find((e) => e.id === sid);
    if (!d) { notes.push(`Dynamic Section Cards: unknown section id "${cleanText(sid, 60)}" — row skipped.`); return; }
    d.cards ??= [];
    let c = d.cards.find((e) => e.CARD_ID === cid);
    if (!c) {
      c = { CARD_ID: cid, CARD_SEQ: 0, CARD_ENABLED: false, CARD_SOURCE_SECTION: sid, CARD_TARGET_SECTION: sid, CARD_NAME_SRC: 'static', CARD_NAME_VALUE: cid, CARD_IMPACT_VAR: null, CARD_IMPACT_FMT: null, CARD_KEY1_VAR: null, CARD_KEY1_FMT: null, CARD_KEY1_LABEL: null, CARD_KEY2_VAR: null, CARD_KEY2_FMT: null, CARD_KEY2_LABEL: null, CARD_OVERLAY_CTRL: null };
      d.cards.push(c);
    }
    const card = c as BoardCard & Record<string, unknown>;
    // The board of this build binds a subset of the legacy variables: an id already on the card is kept even if it is not in that subset.
    const setVar = (f: string, v: unknown) => { const id = safeId(v); card[f] = id && (known.has(id) || card[f] === id) ? id : null; };
    const setFmt = (f: string, v: unknown) => { const id = str(v); card[f] = FORMAT_IDS.includes(id) ? id : null; };
    c.CARD_ENABLED = /^y/i.test(String(x[2] || '')); c.CARD_NAME_VALUE = cleanText(x[3], 120) || c.CARD_NAME_VALUE;
    setVar('CARD_IMPACT_VAR', x[4]); setFmt('CARD_IMPACT_FMT', x[5]); setVar('CARD_KEY1_VAR', x[6]); setFmt('CARD_KEY1_FMT', x[7]); setVar('CARD_KEY2_VAR', x[8]); setFmt('CARD_KEY2_FMT', x[9]);
    const ov = safeId(x[10]); c.CARD_OVERLAY_CTRL = ov || null;
    const src = str(x[11]); if (src && hasSection(src)) c.CARD_SOURCE_SECTION = src;
    const tgt = str(x[12]); if (tgt && hasSection(tgt)) c.CARD_TARGET_SECTION = tgt;
    c.CARD_KEY1_LABEL = cleanText(x[13], 60) || null; c.CARD_KEY2_LABEL = cleanText(x[14], 60) || null;
    const seq = num(x[15]); if (!Number.isNaN(seq)) c.CARD_SEQ = seq;
  });
}
function readRows({ rows, w, notes, hasSection }: ReadCtx): void {
  const r = rows('Dynamic Section Rows'); if (!r) return;
  const known = new Set(VARIABLES.map((v) => v.id));
  r.slice(1).forEach((x) => {
    const sid = str(x[0]); if (!sid) return;
    const d = w.dynamicSections.find((e) => e.id === sid);
    if (!d) { notes.push(`Dynamic Section Rows: unknown section id "${cleanText(sid, 60)}" — row skipped.`); return; }
    const list = (d.rows ??= []) as Row[], rid = safeId(x[1]);
    let row = rid ? list.find((e) => e.id === rid) : undefined;
    if (!row) { row = { id: rid || `row-import-${list.length}`, seq: list.length, label: '', var: null, source: sid, format: 'TEXT', defaultValue: '' }; list.push(row); }
    const seq = num(x[2]); if (!Number.isNaN(seq)) row.seq = seq;
    const label = cleanText(x[3], 120); if (label) row.label = label;
    const src = str(x[7]); if (src && hasSection(src)) row.source = src;
    const v = safeId(x[4]); row.var = v && (known.has(v) || row.var === v) ? v : null;
    const fmt = str(x[5]); if (fmt && FORMAT_IDS.includes(fmt)) row.format = fmt;
    row.defaultValue = x[6] != null ? (typeof x[6] === 'string' ? cleanText(x[6], 200) : x[6]) : row.defaultValue;
  });
}

export const dynamicSections: SheetFamily = { sheets: ['Dynamic Sections'], write: writeSections, read: readSections };
export const dynamicCards: SheetFamily = { sheets: ['Dynamic Section Cards'], write: writeCards, read: readCards };
export const dynamicRows: SheetFamily = { sheets: ['Dynamic Section Rows'], write: writeRows, read: readRows };
