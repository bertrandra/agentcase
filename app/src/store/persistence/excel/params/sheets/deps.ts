/** @calc-zone exports */
import { blue, frz, head, listDV, sheet } from '../kit';
import { cleanText, num, str } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

function writeDeps({ wb, d, secs }: WriteCtx): void {
  const ws = sheet(wb, 'Dependencies', [['Source', 22], ['Target', 22], ['Strength', 10], ['Note (source-level)', 70]]);
  const ids = secs.map((s) => s.id), order = (id: string) => d.GROUPS.find((g) => g.id === id)?.order || 99;
  const sources = [...secs].sort((a,
    b) => order(a.group) - order(b.group) || (a.groupSeq || 0) - (b.groupSeq || 0)).map((s) => s.id).filter((id) => d.SECTION_DEPS[id]
    && Object.keys(d.SECTION_DEPS[id]).length);
  sources.forEach((src) => {
    const edges = d.SECTION_DEPS[src] ?? {};
    Object.keys(edges).forEach((t, i) => {
      const row = ws.addRow([src, t, edges[t] === 'S' ? 'strong' : 'soft', i === 0 ? d.SECTION_DEPS_DESC[src] || '' : '']);
      [1, 2, 3, 4].forEach((k) => blue(row.getCell(k)));
      row.getCell(1).dataValidation = listDV(ids, 'Source section id'); row.getCell(2).dataValidation = listDV(ids, 'Target section id');
      row.getCell(3).dataValidation = listDV(['strong', 'soft'], 'strong = a calculation input · soft = an annotation / signal');
    });
  });
  head(ws); frz(ws);
}
/** The sheet REPLACES the edge registry (deleting a row removes the edge); unknown ids are reported and skipped. */
function readDeps({ rows, w, notes, hasSection }: ReadCtx): void {
  const r = rows('Dependencies'); if (!r || r.length <= 1) return;
  const next: typeof w.SECTION_DEPS = {}, desc: Record<string, string> = {};
  let bad = 0;
  r.slice(1).forEach((x) => {
    const src = str(x[0]), tgt = str(x[1]);
    if (!src && !tgt) return;
    if (!hasSection(src)) { if (src) { bad++; notes.push(`Dependencies: unknown source "${cleanText(src, 60)}" — row skipped.`); } return; }
    const text = cleanText(x[3], 2000); if (text) desc[src] = text;
    if (!tgt) return;
    if (!hasSection(tgt)) { bad++; notes.push(`Dependencies: unknown target "${cleanText(tgt, 60)}" (from "${src}") — edge skipped.`); return; }
    const st = str(x[2]).toLowerCase();
    (next[src] ??= {})[tgt] = st === 'soft' || st === 'i' ? 'I' : 'S';
  });
  w.SECTION_DEPS = next;
  if (Object.keys(desc).length) w.SECTION_DEPS_DESC = { ...w.SECTION_DEPS_DESC, ...desc };
  const edges = Object.values(next).reduce((n, e) => n + Object.keys(e).length, 0);
  notes.push(`Dependencies: imported ${edges} edge(s) across ${Object.keys(next).length} source section(s)${bad ? ` (${bad} skipped)` : ''}.`);
}

const FAMILIES = ['spline', 'logistic', 'gompertz'];
function writeCurve({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'S-Curve', [['Item', 12], ['Month / family', 18], ['Adoption %', 12]]);
  const f = ws.addRow(['Family', d.scurve?.family ?? 'spline', '']); blue(f.getCell(2)); f.getCell(2).dataValidation = listDV(FAMILIES, 'Curve family');
  (Array.isArray(d.scurve?.pts) ? d.scurve.pts : []).forEach((p) => {
    const r = ws.addRow(['Point', Math.round(p.t * 100) / 100, Math.round(p.a * 100) / 100]);
    blue(r.getCell(2));
    blue(r.getCell(3));
  });
  head(ws); frz(ws);
}
/** Control points (>= 3) and curve family; without the sheet a round trip would lose the dragged points. */
function readCurve({ rows, w, notes }: ReadCtx): void {
  const r = rows('S-Curve'); if (!r || r.length <= 1) return;
  const pts: { t: number; a: number }[] = []; let fam: string | null = null;
  r.slice(1).forEach((x) => {
    const item = str(x[0]).toLowerCase();
    if (item === 'family') {
      const f = str(x[1]).toLowerCase();
      if (FAMILIES.includes(f)) fam = f;
      else if (f) notes.push(`S-Curve: unknown family "${cleanText(f, 30)}" ignored.`);
    }
    else if (item === 'point') {
      const t = num(x[1]), a = num(x[2]);
      if (Number.isFinite(t) && Number.isFinite(a) && t >= 1 && t <= 120) pts.push({ t, a: Math.max(0, Math.min(100, a)) });
    }
  });
  if (fam || pts.length >= 3) {
    const cur = w.scurve ?? { pts: null, family: 'spline', curve: 'spline.default' };
    w.scurve = { pts: pts.length >= 3 ? pts : cur.pts, family: fam ?? cur.family, curve: fam ? `${fam}.default` : cur.curve };
    notes.push(`S-Curve: imported ${fam ? `family "${fam}"` : ''}${pts.length >= 3 ? `${fam ? ' and ' : ''}${pts.length} control point(s)` : ''}.`);
  } else if (pts.length) notes.push('S-Curve: needs at least 3 points — sheet ignored.');
}

export const dependencies: SheetFamily = { sheets: ['Dependencies'], write: writeDeps, read: readDeps };
export const sCurve: SheetFamily = { sheets: ['S-Curve'], write: writeCurve, read: readCurve };
