/** @calc-zone exports */
import { REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { workingArtefacts } from '@/domain/artefacts';
import type { Artefact } from '@/domain/types/catalog';
import type { ArtefactEdit, CaseState } from '@/domain/types/state';
import { blue, frz, geDV, head, rangeDV, sheet, ynDV } from '../kit';
import { num, str, yes } from '../safe';
import type { ParamsDoc, ReadCtx, SheetFamily, WriteCtx } from '../types';

const deliverable = (a: Artefact): string => a.deliverable || (a as { purpose?: string }).purpose || '';
const seqCell = (a: Artefact): number | string => (a.seq != null ? a.seq : '');

function writeReg({ wb, c, d }: WriteCtx): void {
  const ws = sheet(wb, 'Reg Artifacts', [['ID', 8], ['Industry', 11], ['Norm', 24], ['Phase', 14], ['Artifact', 52], ['Deliverable', 60], ['Selected', 11], ['% auto', 9], ['Effort weight', 14], ['Seq', 8]]);
  const sel = new Set(d.selectedRegArtefacts);
  c.a.reg.forEach((a) => {
    const row = ws.addRow([a.id, a.industry ?? '', a.norm ?? '', a.phase, a.name, deliverable(a), sel.has(a.id) ? 'Yes' : 'No', +a.agentSup || 0, +a.effort || 0, seqCell(a)]);
    [7, 8, 9, 10].forEach((i) => blue(row.getCell(i)));
    row.getCell(7).dataValidation = ynDV(); row.getCell(8).dataValidation = rangeDV(0, 100, true, '% auto (0-100)');
    row.getCell(9).dataValidation = geDV(0, 'Effort weight ≥ 0'); row.getCell(10).dataValidation = geDV(0, 'Ramp-up sequence ≥ 0');
  });
  head(ws); frz(ws);
}
function writeSdlc({ wb, c, d }: WriteCtx): void {
  const ws = sheet(wb, 'SDLC Artifacts', [['ID', 8], ['Phase', 8], ['Artifact', 52], ['Deliverable', 60], ['Selected', 11], ['% auto', 9], ['Effort weight', 14], ['Seq', 8]]);
  const sel = new Set(d.selectedArtefacts);
  c.a.sdlc.forEach((a) => {
    const row = ws.addRow([a.id, a.phase, a.name, deliverable(a), sel.has(a.id) ? 'Yes' : 'No', a.agentSup, a.effort, seqCell(a)]);
    [5, 6, 7, 8].forEach((i) => blue(row.getCell(i)));
    row.getCell(5).dataValidation = ynDV(); row.getCell(6).dataValidation = rangeDV(0, 100, true, '% auto (0-100)');
    row.getCell(7).dataValidation = geDV(0, 'Effort weight ≥ 0'); row.getCell(8).dataValidation = geDV(0, 'Ramp-up sequence ≥ 0');
  });
  head(ws); frz(ws);
}

/** Edit rows of every catalogue artefact (effective values, as the legacy snapshot lists them) with this sheet's changes laid over. */
function editsWith(list: Artefact[], eff: Artefact[], touched: Map<string, Partial<ArtefactEdit>>): ArtefactEdit[] {
  return list.map((a, i) => { const e = eff[i] as Artefact; return { id: a.id, agentSup: e.agentSup, humanSup: e.humanSup, effort: e.effort, seq: e.seq ?? undefined, ...touched.get(a.id) }; });
}
function collect(r: (string | number | boolean)[][], idCol: number, cols: { sel: number; as: number; ef: number; seq: number; reg?: boolean }, known: (id: string) => boolean, onSel: (id: string, on: boolean) => void) {
  const out = new Map<string, Partial<ArtefactEdit>>();
  r.slice(1).forEach((x) => {
    const id = str(x[idCol]); if (!known(id)) return;
    onSel(id, yes(x[cols.sel]));
    const as = num(x[cols.as]), ef = num(x[cols.ef]), seq = num(x[cols.seq]), e: Partial<ArtefactEdit> = {};
    if (!Number.isNaN(as)) { e.agentSup = Math.max(0, Math.min(100, Math.round(as))); e.humanSup = 100 - e.agentSup; }
    if (!Number.isNaN(ef) && (ef >= 0 || cols.reg)) e.effort = Math.max(0, ef);   // legacy: the regulatory sheet floors at 0, the SDLC sheet ignores negatives
    if (!Number.isNaN(seq)) e.seq = seq;
    out.set(id, e);
  });
  return out;
}

function readReg({ rows, w }: ReadCtx): void {
  const r = rows('Reg Artifacts'); if (!r) return;
  const sel = new Set(w.selectedRegArtefacts), ids = new Set(REG_ARTEFACTS.map((a) => a.id));
  const t = collect(r, 0, { sel: 6, as: 7, ef: 8, seq: 9, reg: true }, (id) => id.startsWith('R') && ids.has(id), (id, on) => { if (on) sel.add(id); else sel.delete(id); });
  w.selectedRegArtefacts = [...sel];
  w.regArtefactsEdited = editsWith(REG_ARTEFACTS, workingArtefacts(w as unknown as CaseState).reg, t);
}
function readSdlc({ rows, w, notes }: ReadCtx): void {
  const r = rows('SDLC Artifacts'); if (!r) return;
  const sel = new Set<string>(), ids = new Set(SDLC_ARTEFACTS.map((a) => a.id));
  const t = collect(r, 0, { sel: 4, as: 5, ef: 6, seq: 7 }, (id) => ids.has(id), (id, on) => { if (on) sel.add(id); });
  w.artefactsEdited = editsWith(SDLC_ARTEFACTS, workingArtefacts(w as unknown as CaseState).sdlc, t);
  if (sel.size) keepSelection(w, sel, notes);
}
/**
 * The artefact selection is what the model computes on: a phase marked "No" that still holds selected artefacts is back in scope (v18.10), and the
 * contradiction is reported.
 */
function keepSelection(w: ParamsDoc, sel: Set<string>, notes: string[]): void {
  w.selectedArtefacts = [...sel];
  const off = new Set(w.phaseOff), contradict: string[] = [];
  [...new Set(SDLC_ARTEFACTS.map((a) => a.phase))].forEach((ph) => {
    if (SDLC_ARTEFACTS.some((a) => a.phase === ph && sel.has(a.id)) && off.has(ph)) { off.delete(ph); contradict.push(ph); }
  });
  w.phaseOff = [...off];
  if (contradict.length) notes.push(`Phase Scope marks ${contradict.join(', ')} as "No", but the SDLC Artifacts sheet selects artefacts in ${contradict.length > 1 ? 'them' : 'it'} — the artefact selection was kept.`);
}

export const regArtifacts: SheetFamily = { sheets: ['Reg Artifacts'], write: writeReg, read: readReg };
export const sdlcArtifacts: SheetFamily = { sheets: ['SDLC Artifacts'], write: writeSdlc, read: readSdlc };
