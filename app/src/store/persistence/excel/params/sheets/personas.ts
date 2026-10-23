/** @calc-zone exports */
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { blue, frz, grey, head, sheet, ynDV } from '../kit';
import { cleanText, okKey, safeId, str } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

const YN = (b: unknown): string => (b ? 'Yes' : 'No');

function writePersonas({ wb, d }: WriteCtx): void {
  // DEV-MENU-STRUCTURES: a "Menu structure" column only when a persona navigates with another structure than the standard one (legacy layout otherwise)
  const ms = d.PERSONAS.some((p) => p.menuStructure && p.menuStructure !== 'standard');
  const ws = sheet(wb, 'Personas', [['ID', 16], ['Label', 26], ['Protected', 12], ['Order', 8], ['Compact nav', 12], ['Default', 9], ...(ms ? [['Menu structure', 18] as [string, number]] : [])]);
  personasByOrder(d.PERSONAS).forEach((p) => {
    const row = ws.addRow([p.id, p.label, YN(p.protected), p.order, YN(p.compactNav), YN(p.default), ...(ms ? [p.menuStructure || 'standard'] : [])]);
    if (ms) blue(row.getCell(7));
    if (p.protected) { grey(row.getCell(3)); grey(row.getCell(1)); }
    row.getCell(4).alignment = { horizontal: 'center' };
    blue(row.getCell(5)); row.getCell(5).dataValidation = ynDV(); blue(row.getCell(6)); row.getCell(6).dataValidation = ynDV(); row.getCell(6).alignment = { horizontal: 'center' };
  });
  head(ws); frz(ws);
}
/**
 * Protected personas are kept; the others are rebuilt from the sheet. A persona's guided sequence is carried over from the previous
 * list (the Persona Sequence sheet overrides it when present), and a single default persona is enforced (first flagged wins).
 */
function readPersonas({ rows, w }: ReadCtx): void {
  const r = rows('Personas'); if (!r) return;
  const prevBy = new Map(w.PERSONAS.map((p) => [p.id, p])), list: Persona[] = w.PERSONAS.filter((p) => p.protected);
  const hdr = (r[0] ?? []).map((h) => str(h).toLowerCase()), defCol = hdr.indexOf('default'), msCol = hdr.indexOf('menu structure');
  r.slice(1).forEach((x) => {
    const id = safeId(x[0]);
    if (!id || list.some((p) => p.protected && p.id === id)) return;
    const prev = prevBy.get(id), compactCell = str(x[4]);
    const entry: Persona = { id, label: cleanText(x[1] || id), protected: /^(yes|y|true)$/i.test(str(x[2])), order: parseInt(String(x[3]), 10) || list.length,
      compactNav: compactCell !== '' ? /^(yes|y|true)$/i.test(compactCell) : !!(prev && prev.compactNav) };
    if (prev?.seq) entry.seq = prev.seq;
    const ms = msCol >= 0 ? safeId(x[msCol]) : prev?.menuStructure ?? '';   // older workbooks have no column: the persona keeps its structure
    if (ms && ms !== 'standard') entry.menuStructure = ms;
    if (defCol >= 0) { const dv = str(x[defCol]); if (/^(yes|y|true|1|x)$/i.test(dv) || (dv === '' && prev?.default)) entry.default = true; }
    else if (prev?.default) entry.default = true;
    list.push(entry);
  });
  let seen = false;
  list.forEach((p) => { if (p.default) { if (seen) delete p.default; else seen = true; } });
  w.PERSONAS = list;
}

function writeAssign({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Persona Sections', [['Persona ID', 16], ['Section ID', 16]]);
  d.PERSONAS.filter((p) => !p.protected).forEach((p) => (d.PERSONA_SECTIONS[p.id] || []).forEach((sid) => ws.addRow([p.id, sid])));
  head(ws); frz(ws);
}
/** Membership only (order lives on the Sections sheet); unknown sections are skipped silently, the sheet replaces all assignments. */
function readAssign({ rows, w, hasSection }: ReadCtx): void {
  const r = rows('Persona Sections'); if (!r) return;
  const acc: Record<string, string[]> = {};
  r.slice(1).forEach((x) => {
    const pid = str(x[0]), sid = str(x[1]);
    if (!okKey(pid) || !sid || !hasSection(sid)) return;
    (acc[pid] ??= []).push(sid);
  });
  w.PERSONA_SECTIONS = acc;
}

export const personas: SheetFamily = { sheets: ['Personas'], write: writePersonas, read: readPersonas };
export const personaSections: SheetFamily = { sheets: ['Persona Sections'], write: writeAssign, read: readAssign };
