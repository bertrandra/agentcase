/** @calc-zone exports */
import { LOCATIONS, REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { snapFTE } from '@/domain/baseline/apportion';
import { GRADES, SKILLS_EXIST } from '@/domain/baseline/skills';
import { blue, frz, geDV, head, listDV, sheet } from '../kit';
import { cleanText, num, str } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

const BANDS = ['A', 'B', 'C', 'D', 'F'];
const LOC_NAMES = LOCATIONS.map((l) => l.name);

function writeRate({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Rate Card', [['Grade band', 12], ...LOC_NAMES.map((n): [string, number] => [n, 11])]);
  BANDS.forEach((b) => {
    const row = ws.addRow([b, ...LOC_NAMES.map((l) => d.RATE[l]?.[b] ?? '')]);
    row.getCell(1).font = { bold: true, size: 11 };
    LOC_NAMES.forEach((_l, i) => { const c = row.getCell(2 + i); blue(c); c.dataValidation = geDV(0, 'Day rate €/day, ≥ 0'); });
  });
  head(ws); frz(ws);
}
function readRate({ rows, w }: ReadCtx): void {
  const r = rows('Rate Card'); if (!r) return;
  const hdr = (r[0] ?? []).slice(1).map(str);
  r.slice(1).forEach((x) => {
    const band = str(x[0]); if (!BANDS.includes(band)) return;
    hdr.forEach((loc, i) => {
      const v = num(x[i + 1]), row = LOC_NAMES.includes(loc) ? w.RATE[loc] : undefined;
      if (!Number.isNaN(v) && v >= 0 && row) row[band] = v;
    });
  });
}

function writeTeam({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Input Team', [['Skill', 16], ['Grade', 9], ['Location', 12], ['FTE', 8], ['Pinned artefacts (; separated)', 46]]);
  d.teamIn.forEach((t) => {
    const row = ws.addRow([t.skill, t.grade, t.loc, t.etp, (t.pins || []).join(';')]);
    [1, 2, 3, 4, 5].forEach((i) => blue(row.getCell(i)));
    row.getCell(1).alignment = { horizontal: 'left' };
  });
  for (let r = 2; r <= 40; r++) {
    ws.getCell(`A${r}`).dataValidation = listDV(SKILLS_EXIST, 'Skill'); ws.getCell(`B${r}`).dataValidation = listDV(GRADES, 'Grade');
    ws.getCell(`C${r}`).dataValidation = listDV(LOC_NAMES, 'Location'); ws.getCell(`D${r}`).dataValidation = geDV(0, 'FTE ≥ 0');
  }
  head(ws); frz(ws);
}
const KNOWN_ART = new Set([...SDLC_ARTEFACTS, ...REG_ARTEFACTS].map((a) => a.id));
function readTeam({ rows, w, notes }: ReadCtx): void {
  const r = rows('Input Team'); if (!r) return;
  const nt: { skill: string; grade: string; loc: string; etp: number; pins: string[] }[] = [];
  r.slice(1).forEach((x) => {
    if (str(x[0]) === '') return;
    const loc = str(x[2]), raw = num(x[3]);
    if (Number.isNaN(raw) || raw < 0) return;
    if (!LOC_NAMES.includes(loc)) { notes.push(`Unknown location "${cleanText(loc, 40)}" in team — row skipped`); return; }
    nt.push({ skill: cleanText(x[0], 60), grade: cleanText(x[1], 20), loc, etp: snapFTE(raw), pins: String(x[4] || '').split(';').map((p) => p.trim()).filter(Boolean) });
  });
  if (!nt.length) { notes.push('Input Team empty — kept previous team'); return; }
  const seen = new Set<string>(); let dropped = 0, dup = 0;
  nt.forEach((t) => { t.pins = t.pins.filter((id) => { if (!KNOWN_ART.has(id)) { dropped++; return false; } if (seen.has(id)) { dup++; return false; } seen.add(id); return true; }); });
  if (dropped) notes.push(`${dropped} pinned artefact id(s) unknown — dropped`);
  if (dup) notes.push(`${dup} artefact(s) pinned on several lines — kept on the first`);
  w.teamIn = nt;
  w.dom.values.asisTotalFte = String(Math.round(nt.reduce((s, t) => s + (+t.etp || 0), 0) * 100) / 100);
}

export const rateCard: SheetFamily = { sheets: ['Rate Card'], write: writeRate, read: readRate };
export const inputTeam: SheetFamily = { sheets: ['Input Team'], write: writeTeam, read: readTeam };
