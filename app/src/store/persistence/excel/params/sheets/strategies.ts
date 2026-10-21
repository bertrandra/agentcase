import { LOCATIONS } from '@/domain/catalog';
import { frz, head, sheet } from '../kit';
import { num, okKey, str } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

const NAMES = LOCATIONS.map((l) => l.name);
const blank = (v: unknown): number | string => (v == null ? '' : (v as number));

function write({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Strategies', [['Strategy', 20], ['Auto %', 9], ['Y1', 7], ['Y2', 7], ['Y3', 7], ['Ceiling %', 10], ['Setup x', 9], ['Run x', 8], ['Risk (1-5)', 10], ['Agility (1-5)', 11], ['Split mode', 12], ...NAMES.map((n): [string, number] => [n, 10])]);
  d.strategyDefs.forEach((S) => {
    const mode = S.locSplit == null ? 'inherit' : S.locSplit === 'ASIS' ? 'asis' : 'custom', L = S.levers ?? {}, split = typeof S.locSplit === 'object' && S.locSplit ? S.locSplit : {};
    ws.addRow([S.id, blank(L.auto), blank(L.y1), blank(L.y2), blank(L.y3), blank(L.ceiling), L.setupF == null ? 1 : L.setupF, L.runF == null ? 1 : L.runF,
      S.declared?.risk || 3, S.declared?.agility || 3, mode, ...NAMES.map((n) => (mode === 'custom' ? split[n] || 0 : ''))]);
  });
  head(ws); frz(ws);
}
/** Lever and declared-rating cells of known strategies are replaced from the sheet; "Split mode" picks inherit / as-is / a custom location split. */
function read({ rows, w }: ReadCtx): void {
  const r = rows('Strategies'); if (!r || r.length <= 1) return;
  const hdr = (r[0] ?? []).map(str), locStart = 11, lNames = hdr.slice(locStart);
  const n = (x: unknown): number | null => { const v = num(x); return Number.isNaN(v) ? null : v; };
  r.slice(1).forEach((x) => {
    const S = w.strategyDefs.find((s) => s.id === str(x[0])); if (!S) return;
    S.levers = { auto: n(x[1]), y1: n(x[2]), y2: n(x[3]), y3: n(x[4]), ceiling: n(x[5]), setupF: n(x[6]) ?? 1, runF: n(x[7]) ?? 1 };
    S.declared = { risk: Math.max(1, Math.min(5, Math.round(n(x[8]) || 3))), agility: Math.max(1, Math.min(5, Math.round(n(x[9]) || 3))) };
    const mode = str(x[10]) || 'inherit';
    if (mode === 'asis') S.locSplit = 'ASIS';
    else if (mode === 'custom') { const sp: Record<string, number> = {}; lNames.forEach((h, i) => { if (h && okKey(h)) sp[h] = n(x[locStart + i]) || 0; }); S.locSplit = sp; }
    else S.locSplit = null;
  });
}

export const strategies: SheetFamily = { sheets: ['Strategies'], write, read };
