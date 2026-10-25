/** @calc-zone exports */
import { ALL_PHASE_IDS, LOCATIONS, PHASES, SDLC_ARTEFACTS } from '@/domain/catalog';
import { locationMix } from '@/domain/location';
import { phaseRows } from '@/domain/scopeView';
import type { CaseState } from '@/domain/types/state';
import { blue, frz, geDV, grey, head, listDV, note, rangeDV, sheet } from '../kit';
import { num, str, yes } from '../safe';
import type { ParamsDoc, ReadCtx, SheetFamily, WriteCtx } from '../types';

function writePhases({ wb, c }: WriteCtx): void {
  const ws = sheet(wb, 'Phase Scope', [['Phase ID', 10], ['Phase name', 20], ['Included', 10]]);
  const state = new Map(phaseRows(c, false).map((r) => [r.phase.id, r.state]));
  PHASES.forEach((ph) => {
    const row = ws.addRow([ph.id, ph.name, (state.get(ph.id) ?? 'none') !== 'none' ? 'Yes' : 'No']);
    blue(row.getCell(3)); row.getCell(3).dataValidation = listDV(['Yes', 'No'], 'Include this phase?');
  });
  head(ws); frz(ws);
}
function readPhases({ rows, w, notes }: ReadCtx): void {
  const r = rows('Phase Scope'); if (!r) return;
  const sel = r.slice(1).map((x) => [str(x[0]), x[2]] as const).filter(([id, inc]) => ALL_PHASE_IDS.includes(id) && yes(inc)).map(([id]) => id);
  if (!sel.length) { notes.push('No phase included — kept previous scope'); return; }
  w.selectedArtefacts = SDLC_ARTEFACTS.filter((a) => sel.includes(a.phase)).map((a) => a.id);
  w.phaseOff = ALL_PHASE_IDS.filter((id) => !sel.includes(id));
}

/** The target location mix, seeded from the AS-IS team when the case has none yet (legacy ensureTargetLoc). */
export function ensureTargetLoc(w: ParamsDoc): Record<string, number> {
  if (!w.targetLocPct) {
    const mx = locationMix(w as unknown as CaseState), t: Record<string, number> = {};
    LOCATIONS.forEach((l) => { t[l.name] = Math.round((mx.pct[l.name] ?? 0) * 10) / 10; });
    w.targetLocPct = t;
  }
  return w.targetLocPct;
}
function writeTarget({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Location Target', [['Location', 12], ['Classification', 14], ['Target %', 10]]);
  const t = ensureTargetLoc(structuredClone(d));
  LOCATIONS.forEach((l) => {
    // legacy rounded to whole %, which silently changed the cost on re-import: one decimal is what the target mix is seeded with
    const row = ws.addRow([l.name, l.cls, Math.round((t[l.name] || 0) * 10) / 10]);
    blue(row.getCell(3)); row.getCell(3).dataValidation = rangeDV(0, 100, false, 'Share 0–100 (should sum to 100)');
  });
  head(ws); frz(ws);
}
function readTarget({ rows, w, notes, clamp }: ReadCtx): void {
  const r = rows('Location Target'); if (!r) return;
  const t = ensureTargetLoc(w); let any = false;
  r.slice(1).forEach((x) => {
    const loc = str(x[0]), pct = num(x[2]);
    if (LOCATIONS.some((l) => l.name === loc) && t[loc] !== undefined && !Number.isNaN(pct)) { t[loc] = clamp(pct, 0, 100, `Target % ${loc}`); any = true; }
  });
  if (!any) return;
  const sum = LOCATIONS.reduce((s, l) => s + (t[l.name] || 0), 0);
  if (Math.abs(sum - 100) > 1) notes.push(`Location targets sum to ${Math.round(sum)}% (should be 100%)`);
}

function writeQuality({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Quality AS-IS', [['Metric', 20], ['AS-IS', 10], ['Target', 10], ['Source', 14]]);
  d.QUALITY.forEach((q) => {
    const row = ws.addRow([q[0], q[1], q[2], q[3]]);
    blue(row.getCell(2)); row.getCell(2).dataValidation = geDV(0, 'AS-IS baseline ≥ 0'); grey(row.getCell(3)); note(row.getCell(4));
  });
  head(ws); frz(ws);
}
function readQuality({ rows, w }: ReadCtx): void {
  const r = rows('Quality AS-IS'); if (!r) return;
  r.slice(1).forEach((x) => { const v = num(x[1]), q = w.QUALITY.find((e) => e[0] === str(x[0])); if (q && !Number.isNaN(v)) q[1] = v; });
}

export const phaseScope: SheetFamily = { sheets: ['Phase Scope'], write: writePhases, read: readPhases };
export const locationTarget: SheetFamily = { sheets: ['Location Target'], write: writeTarget, read: readTarget };
export const qualityAsIs: SheetFamily = { sheets: ['Quality AS-IS'], write: writeQuality, read: readQuality };
