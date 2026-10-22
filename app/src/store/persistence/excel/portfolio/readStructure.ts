import { clean } from '@/domain/portfolio/products';
import type { HubSettings, Product, Wave } from '@/domain/portfolio';
import { cleanText, str } from '../params/safe';
import type { Sheets } from '../params/types';
import { PF_LIMITS, PF_SHEETS } from './names';
import { fail, flagCell, idOf, numberCell, tab, type Tab } from './tab';

const NEED_PRODUCTS = 'a portfolio workbook needs the Products sheet';

export interface ProductRow { id: string; name: string; waveId: string | null; offset: number; position: number; note?: string; archived?: boolean }
export interface WaveRow { id: string; name: string; startMonth: number; note?: string; order: number }

/** Products sheet: unique safe ids, names, wave reference (checked against Waves later), offset, position in the wave, note, archived. Capped at 50. */
export function readProductRows(sheets: Sheets): ProductRow[] {
  const t = tab(sheets, PF_SHEETS.products);
  if (!t) return fail(PF_SHEETS.products, null, NEED_PRODUCTS);
  if (!t.lines.length) fail(t.name, null, 'a portfolio needs at least one product');
  if (t.lines.length > PF_LIMITS.products) fail(t.name, null, `too many products (${t.lines.length}, limit ${PF_LIMITS.products})`);
  const seen = new Set<string>();
  return t.lines.map((l) => {
    const id = idOf(t, l, 'product id'), name = cleanText(l.c[1], 80);
    if (seen.has(id)) fail(t.name, l.n, `duplicate product id "${id}"`);
    seen.add(id);
    if (!name) fail(t.name, l.n, 'name is required');
    const wave = str(l.c[2]), pos = numberCell(t, l, 4, 'position in wave', { min: 1, max: 1000, int: true, optional: true });
    return clean({ id, name, waveId: wave === '' ? null : wave, offset: numberCell(t, l, 3, 'offset', { min: 0, max: PF_LIMITS.offset, int: true, optional: true }) ?? 0,
      position: pos ?? Number.MAX_SAFE_INTEGER, note: cleanText(l.c[5], 400) || undefined, archived: flagCell(t, l, 6, 'archived') || undefined });
  });
}

/** Waves sheet: unique safe ids, names, start month, order. A missing sheet means no wave (every product must then be unplanned). Capped at 50. */
export function readWaveRows(sheets: Sheets): WaveRow[] {
  const t = tab(sheets, PF_SHEETS.waves);
  if (!t) return [];
  if (t.lines.length > PF_LIMITS.waves) fail(t.name, null, `too many waves (${t.lines.length}, limit ${PF_LIMITS.waves})`);
  const seen = new Set<string>();
  const rows = t.lines.map((l, i) => {
    const id = idOf(t, l, 'wave id'), name = cleanText(l.c[1], 80);
    if (seen.has(id)) fail(t.name, l.n, `duplicate wave id "${id}"`);
    seen.add(id);
    if (!name) fail(t.name, l.n, 'name is required');
    return clean({ id, name, startMonth: numberCell(t, l, 2, 'start month', { min: 0, max: PF_LIMITS.startMonth, int: true }) as number, note: cleanText(l.c[3], 400) || undefined,
      order: numberCell(t, l, 4, 'order', { min: 1, max: 1000, int: true, optional: true }) ?? i + 1 });
  });
  return rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.order - b.r.order || a.i - b.i).map((x) => x.r);
}

/** Waves with their products listed by position; a product pointing at an unknown wave is an error. */
export function assemble(rows: ProductRow[], waves: WaveRow[], build: (r: ProductRow) => Product): { products: Product[]; waves: Wave[] } {
  const known = new Set(waves.map((w) => w.id));
  for (const r of rows) if (r.waveId !== null && !known.has(r.waveId)) fail(PF_SHEETS.products, null, `product "${r.id}" points at unknown wave "${r.waveId.slice(0, 40)}"`);
  const byPos = (w: WaveRow) => rows.map((r, i) => ({ r, i })).filter((x) => x.r.waveId === w.id).sort((a, b) => a.r.position - b.r.position || a.i - b.i).map((x) => x.r.id);
  return { products: rows.map(build), waves: waves.map((w) => clean({ id: w.id, name: w.name, note: w.note, startMonth: w.startMonth, productIds: byPos(w) })) };
}

/** PortfolioSettings sheet (all keys optional): hub, horizon, start date, active product. Values are checked, never clamped. */
export function readSettings(sheets: Sheets, base: { hub: HubSettings; horizonMonths: number; startDate: string; activeProductId: string; rho: number }, ids: ReadonlySet<string>) {
  const t = tab(sheets, PF_SHEETS.settings), out = { ...base };
  if (!t) return out;
  for (const l of t.lines) {
    const key = str(l.c[0]).toLowerCase();
    if (key === 'hub enabled') out.hub = { ...out.hub, enabled: flagCell(t, l, 1, 'hub enabled') ?? out.hub.enabled };
    else if (key.startsWith('hub infrastructure (')) out.hub = { ...out.hub, infraMonthly: numberCell(t, l, 1, 'hub infrastructure', { min: 0, max: 1e9 }) as number };
    else if (key === 'hub infrastructure allocation') out.hub = { ...out.hub, infraAllocation: allocation(t, l.n, str(l.c[1])) };
    else if (key === 'horizon (months)') out.horizonMonths = numberCell(t, l, 1, 'horizon', { min: 1, max: 120, int: true }) as number;
    else if (key.startsWith('correlation rho')) out.rho = numberCell(t, l, 1, 'correlation rho', { min: 0, max: 1 }) as number;
    else if (key === 'start date (iso)') out.startDate = isoDate(t, l.n, str(l.c[1]));
    else if (key === 'active product id') { const id = str(l.c[1]); if (id && !ids.has(id)) fail(t.name, l.n, `unknown active product "${id.slice(0, 40)}"`); if (id) out.activeProductId = id; }
  }
  return out;
}

function allocation(t: Tab, n: number, v: string): HubSettings['infraAllocation'] {
  return v === 'perProduct' || v === 'byBaseEtp' ? v : fail(t.name, n, `allocation must be perProduct or byBaseEtp (got "${v.slice(0, 20)}")`);
}
function isoDate(t: Tab, n: number, v: string): string {
  if (v === '') return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : fail(t.name, n, `start date must be yyyy-mm-dd (got "${v.slice(0, 20)}")`);
}
