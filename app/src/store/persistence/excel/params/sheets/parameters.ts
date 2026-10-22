/** @calc-zone exports */
import { INDUSTRIES } from '@/domain/frame/profile';
import { blue, frz, head, listDV, note, rangeDV, sheet, style } from '../kit';
import { cleanText, num, str } from '../safe';
import type { ParamsDoc, ReadCtx, SheetFamily, WriteCtx } from '../types';

/** Editable scalar parameters with their constraints (legacy IO_PARAMS): id, label, min, max, type. */
export type ParamDef = [string, string, number, number, 'int' | 'num' | 'enum35'];
export const IO_PARAMS: ParamDef[] = [
  ['autoPotential', 'Automation potential (%)', 10, 80, 'int'], ['glassCeiling', 'Glass ceiling (%)', 0, 50, 'int'],
  ['y1Ramp', 'Year 1 ramp (%)', 5, 40, 'int'], ['y2Ramp', 'Year 2 ramp (%)', 20, 70, 'int'], ['y3Ramp', 'Year 3 ramp (%)', 40, 100, 'int'],
  ['horizon', 'Horizon (years)', 1, 10, 'enum35'],
  ['setupTooling', 'Setup tooling (€)', 0, 1000000, 'num'], ['setupTraining', 'Setup training (€)', 0, 1000000, 'num'],
  ['setupCoaching', 'Setup coaching (€)', 0, 1000000, 'num'], ['setupGov', 'Setup governance (€)', 0, 1000000, 'num'],
  ['tokensPerArt', 'Tokens / agent run', 0, 1000000, 'num'], ['runsPerDay', 'Agent runs / day per FTE', 0, 200, 'int'],
  ['infra', 'Monthly infra (€)', 0, 1000000, 'num'], ['workdays', 'Working days / year', 180, 260, 'int'], ['classicSaving', 'Classic annual saving (%)', 0, 15, 'int'],
];
const HORIZONS = [1, 2, 3, 5, 7, 10];
/** Inputs that are sliders in the legacy page: assigning a fractional value snaps to whole numbers. */
const SLIDERS = new Set(['autoPotential', 'glassCeiling', 'y1Ramp', 'y2Ramp', 'y3Ramp', 'classicSaving']);

function write({ wb, d }: WriteCtx): void {
  const ws = sheet(wb, 'Parameters', [['Parameter', 30], ['Value', 14], ['Min', 8], ['Max', 10], ['Notes', 34]]);
  IO_PARAMS.forEach(([id, label, mn, mx, type]) => {
    const raw = d.dom.values[id], v = raw === undefined ? NaN : type === 'enum35' ? parseInt(raw, 10) : parseFloat(raw);
    const row = ws.addRow([label, Number.isNaN(v) ? '' : v, mn, mx, type === 'enum35' ? '1,2,3,5,7 or 10' : type === 'int' ? 'whole' : 'number']);
    style(row, ' bggn');
    row.getCell(2).dataValidation = type === 'enum35' ? listDV(HORIZONS, 'Horizon: 1, 2, 3, 5, 7 or 10 years') : rangeDV(mn, mx, type === 'int', `${label}: ${mn}–${mx}`);
  });
  const ir = ws.addRow(['Industry (code)', d.dom.values.industry ?? 'NONE', '', '', 'One of the codes']);
  blue(ir.getCell(2)); note(ir.getCell(5)); ir.getCell(2).dataValidation = listDV(INDUSTRIES.map((i) => i.code), 'Industry code');
  const cr = ws.addRow(['Customer', d.customerName || '', '', '', 'Client name — shown in the app title as "AgentCase for …"']);
  blue(cr.getCell(2)); note(cr.getCell(5));
  head(ws); frz(ws);
}

function read({ rows, w, clamp }: ReadCtx): void {
  const r = rows('Parameters'); if (!r) return;
  const map = new Map<string, unknown>();
  r.slice(1).forEach((x) => { if (x[0] != null && x[0] !== '') map.set(str(x[0]), x[1]); });
  IO_PARAMS.forEach(([id, label, mn, mx, type]) => {
    const v = map.get(label); if (v === undefined || v === '') return;
    let n = num(v); if (Number.isNaN(n)) return;
    if (type === 'enum35') n = HORIZONS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
    else n = clamp(n, mn, mx, label);
    w.dom.values[id] = String(SLIDERS.has(id) ? Math.round(n) : n);
  });
  const ind = map.get('Industry (code)');
  if (ind && INDUSTRIES.some((i) => i.code === str(ind))) w.dom.values.industry = str(ind);
  if (map.has('Customer')) setCustomer(w, cleanText(map.get('Customer')));
}
export function setCustomer(w: ParamsDoc, name: string): void { w.customerName = name; w.dom.values.customerName = name; }

export const parameters: SheetFamily = { sheets: ['Parameters'], write, read };
