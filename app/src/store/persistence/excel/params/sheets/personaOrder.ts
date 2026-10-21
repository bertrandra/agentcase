import { blue, frz, head, listDV, sheet, ynDV } from '../kit';
import { num, okKey, str } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

function writeOrder({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Persona Section Order', [['Persona ID', 16], ['Section ID', 16], ['Order', 8]]);
  Object.keys(d.PERSONA_SECTION_ORDER).forEach((pid) => {
    const ov = d.PERSONA_SECTION_ORDER[pid] || {};
    Object.keys(ov).forEach((sid) => blue(ws.addRow([pid, sid, ov[sid]]).getCell(3)));
  });
  head(ws); frz(ws);
}
/** Per-persona sparse order override; an absent sheet leaves the registry exactly as it is. */
function readOrder({ rows, w, hasSection }: ReadCtx): void {
  const r = rows('Persona Section Order'); if (!r) return;
  const acc: Record<string, Record<string, number>> = {};
  r.slice(1).forEach((x) => {
    const pid = str(x[0]), sid = str(x[1]), ord = num(x[2]);
    if (!okKey(pid) || !okKey(sid) || Number.isNaN(ord) || !hasSection(sid)) return;
    (acc[pid] ??= {})[sid] = ord;
  });
  w.PERSONA_SECTION_ORDER = acc;
}

function writeSeq({ wb, d, secs }: WriteCtx): void {
  const ws = sheet(wb, 'Persona Sequence', [['Persona ID', 16], ['Enabled', 9], ['Step #', 8], ['Step Label', 34], ['Section ID', 16]]);
  const ids = secs.map((s) => s.id);
  d.PERSONAS.forEach((p) => {
    if (!p.seq || !Array.isArray(p.seq.steps) || !p.seq.steps.length) return;
    p.seq.steps.forEach((st, si) => {
      (st.sections && st.sections.length ? st.sections : ['']).forEach((sid) => {
        const row = ws.addRow([p.id, p.seq?.on ? 'Yes' : 'No', si + 1, st.label || '', sid]);
        [2, 3, 4, 5].forEach((i) => blue(row.getCell(i)));
        row.getCell(2).dataValidation = ynDV(); if (sid) row.getCell(5).dataValidation = listDV(ids, 'Section id');
      });
    });
  });
  head(ws); frz(ws);
}
/** The guided sequence: row order is authoritative for step order and sections within a step ("Step #" only groups rows). */
function readSeq({ rows, w, hasSection }: ReadCtx): void {
  const r = rows('Persona Sequence'); if (!r) return;
  interface Acc { on: boolean; order: number[]; steps: Map<number, { label: string; sections: string[] }> }
  const by = new Map<string, Acc>();
  r.slice(1).forEach((x) => {
    const pid = str(x[0]); if (!pid || !w.PERSONAS.some((p) => p.id === pid)) return;
    const stepNo = parseInt(String(x[2]), 10); if (Number.isNaN(stepNo) || stepNo < 1) return;
    let a = by.get(pid);
    if (!a) { a = { on: /^(yes|y|true)$/.test(str(x[1]).toLowerCase()), order: [], steps: new Map() }; by.set(pid, a); }
    let st = a.steps.get(stepNo);
    if (!st) { st = { label: str(x[3]), sections: [] }; a.steps.set(stepNo, st); a.order.push(stepNo); }
    const sid = str(x[4]); if (sid && hasSection(sid)) st.sections.push(sid);
  });
  by.forEach((a, pid) => { const p = w.PERSONAS.find((q) => q.id === pid); if (p) p.seq = { on: a.on, steps: a.order.map((n) => a.steps.get(n) as { label: string; sections: string[] }) }; });
}

export const personaSectionOrder: SheetFamily = { sheets: ['Persona Section Order'], write: writeOrder, read: readOrder };
export const personaSequence: SheetFamily = { sheets: ['Persona Sequence'], write: writeSeq, read: readSeq };
