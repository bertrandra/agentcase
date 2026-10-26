import surface from '@/content/refshare/calcengine-surface.json';
import { model, modelRaw, type Ctx } from '@/domain';

export const OVERLAID: string[] = surface.overlaid;
export const NESTED: string[] = surface.overlaidNested;

export interface OverlayRow { field: string; source: 'OVERLAID' | 'raw'; delta: number | null; type: string }

const typeOf = (v: unknown): string => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
const flat = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : typeof v === 'number' ? [v] : []);

/** Relative change of an overlaid field against its pre-overlay value: sum |Δ| / sum |raw| (0 when nothing moved, null when not numeric). */
export function relDelta(raw: unknown, over: unknown): number | null {
  const a = flat(raw), b = flat(over);
  if (!a.length || a.length !== b.length) return null;
  const den = a.reduce((s, x) => s + Math.abs(x), 0), num = a.reduce((s, x, i) => s + Math.abs((b[i] as number) - x), 0);
  return num === 0 ? 0 : den === 0 ? 1 : num / den;
}

const get = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((x, k) => (x as Record<string, unknown> | undefined)?.[k], o);

/** model() against modelRaw() for the live case: which fields the Time-Engine overlay rewrites and by how much they move right now. */
export function overlayRows(c: Ctx): { rows: OverlayRow[]; nested: OverlayRow[]; curve: string; horizon: number } {
  const raw = modelRaw(c), over = model(c) as unknown as Record<string, unknown>, rawR = raw as unknown as Record<string, unknown>;
  const rows = Object.keys(over).filter((k) => !k.startsWith('_')).map<OverlayRow>((field) => ({
    field, source: OVERLAID.includes(field) ? 'OVERLAID' : 'raw', delta: OVERLAID.includes(field) ? relDelta(rawR[field], over[field]) : null,
    type: typeOf(over[field]),
  })).sort((a, b) => (a.source === b.source ? a.field.localeCompare(b.field) : a.source === 'OVERLAID' ? -1 : 1));
  const nested = NESTED.map<OverlayRow>((field) =>
    ({ field, source: 'OVERLAID', delta: relDelta(get(raw, field), get(over, field)), type: typeOf(get(over, field)) }));
  return { rows, nested, curve: String(c.s.scurve?.curve || 'spline.default'), horizon: over.horizon as number };
}
