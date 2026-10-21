import { REG_ARTEFACTS, REG_NORMS } from '@/domain/catalog';
import { tokenModelRows, tokenUsage } from '@/domain/tuneB/tokens';
import { blue, frz, geDV, grey, head, rangeDV, sheet, style, ynDV } from '../kit';
import { cleanText, num, str, yes } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

function writeTokens({ wb, d, c }: WriteCtx): void {
  const lbl = tokenUsage(c).endLabel, t = tokenModelRows(c);
  const ws = sheet(wb, 'Token Models', [['Model', 22], ['Mix %', 9], ['Price in (€/1M)', 14], ['Price out (€/1M)', 14], [`Tokens ${lbl} (M)`, 14], [`Cost ${lbl} (€)`, 13]]);
  t.rows.forEach((m) => {
    const row = ws.addRow([m.name, m.mix, m.priceIn, m.priceOut, Math.round(m.volM * 10) / 10, Math.round(m.cost)]);
    [1, 2, 3, 4].forEach((i) => blue(row.getCell(i))); row.getCell(1).alignment = { horizontal: 'left' };
    row.getCell(2).dataValidation = rangeDV(0, 100, false, 'Usage mix 0–100 (should sum to 100)');
    row.getCell(3).dataValidation = geDV(0, 'Input price €/1M ≥ 0'); row.getCell(4).dataValidation = geDV(0, 'Output price €/1M ≥ 0');
    grey(row.getCell(5)); grey(row.getCell(6));
  });
  ws.addRow([]);
  const os = ws.addRow(['Output token share %', d.TOK_OUT_SHARE]);
  os.getCell(1).font = { bold: true }; blue(os.getCell(2)); os.getCell(2).dataValidation = rangeDV(0, 100, false, 'Output token share 0–100');
  head(ws); frz(ws);
}
function readTokens({ rows, w }: ReadCtx): void {
  const r = rows('Token Models'); if (!r) return;
  const nm: typeof w.TOKEN_MODELS = [], pos = (v: unknown) => { const n = num(v); return Number.isNaN(n) ? 0 : Math.max(0, n); };
  r.slice(1).forEach((x) => {
    const name = str(x[0]); if (!name) return;
    if (name.toLowerCase().startsWith('output token share')) { const os = num(x[1]); if (!Number.isNaN(os)) w.TOK_OUT_SHARE = Math.max(0, Math.min(100, os)); return; }
    nm.push({ name: cleanText(name, 60), mix: Math.min(100, pos(x[1])), priceIn: pos(x[2]), priceOut: pos(x[3]) });
  });
  if (nm.length) w.TOKEN_MODELS = nm;
  w.dom.values.tokOutShare = String(Math.round(w.TOK_OUT_SHARE));
}

const SETTINGS: [string, 'regUse' | 'regInclude' | 'forceGlassCeiling', string, string][] = [
  ['Use Regulatory catalog', 'regUse', 'regUse', 'Master toggle for the regulatory panel'],
  ['Include reg. artifacts in effort & runs', 'regInclude', 'regInclude', 'If No, regs drive only the glass ceiling'],
  ['Force glass ceiling', 'forceGlassCeiling', 'forceGC', 'If Yes, the slider value overrides the reg-computed ceiling'],
];
function writeSettings({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Reg Settings', [['Setting', 34], ['Value', 10], ['Notes', 56]]);
  SETTINGS.forEach(([label, key, , hint]) => { const row = ws.addRow([label, d[key] ? 'Yes' : 'No', hint]); style(row, ' bn'); row.getCell(2).dataValidation = ynDV(); });
  head(ws); frz(ws);
}
function readSettings({ rows, w }: ReadCtx): void {
  const r = rows('Reg Settings'); if (!r) return;
  const map = new Map(r.slice(1).filter((x) => x[0] != null && x[0] !== '').map((x) => [str(x[0]), x[1]] as const));
  SETTINGS.forEach(([label, key, domKey]) => { if (map.has(label)) w[key] = yes(map.get(label)); w.dom.checked[domKey] = w[key]; });
}

function writeNorms({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Reg Norms', [['Industry', 12], ['Norm', 26], ['Artifacts', 10], ['Included', 11]]);
  const on = new Set(d.selectedNorms);
  REG_NORMS.forEach((n) => {
    const row = ws.addRow([n.industry, n.name, n.count, on.has(`${n.industry}:${n.name}`) ? 'Yes' : 'No']);
    blue(row.getCell(4)); row.getCell(4).dataValidation = ynDV(); grey(row.getCell(3));
  });
  head(ws); frz(ws);
}
/** Ticking a norm selects all of its artefacts; the Reg Artifacts sheet then refines the selection individually. */
function readNorms({ rows, w }: ReadCtx): void {
  const r = rows('Reg Norms'); if (!r) return;
  const norms = new Set<string>(), regs = new Set<string>();
  r.slice(1).forEach((x) => {
    const ic = str(x[0]), nm = str(x[1]);
    if (!ic || !nm || !yes(x[3])) return;
    norms.add(`${ic}:${nm}`);
    REG_ARTEFACTS.filter((a) => a.industry === ic && a.norm === nm).forEach((a) => regs.add(a.id));
  });
  w.selectedNorms = [...norms]; w.selectedRegArtefacts = [...regs];
}

export const tokenModels: SheetFamily = { sheets: ['Token Models'], write: writeTokens, read: readTokens };
export const regSettings: SheetFamily = { sheets: ['Reg Settings'], write: writeSettings, read: readSettings };
export const regNorms: SheetFamily = { sheets: ['Reg Norms'], write: writeNorms, read: readNorms };
