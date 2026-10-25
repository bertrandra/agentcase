/** @calc-zone exports */
import { parseRef } from '@/domain/portfolio';
import { sanitize } from '../../snapshot';
import { str } from '../params/safe';
import type { Sheets } from '../params/types';
import { PF_LIMITS, PF_SHEETS } from './names';
import { fail, knownProduct, numberCell, tab, type Line, type Tab } from './tab';

type Shape = 'strings' | 'bool' | 'number' | 'array' | 'object' | 'objectOrNull';
/** Expected JSON type of each whitelisted top-level key (spec 4.3); form fields are text (`values.*`) or booleans (`checked.*`). */
const SHAPES: Record<string, Shape> = {
  selectedArtefacts: 'strings', selectedRegArtefacts: 'strings', phaseOff: 'strings', selectedNorms: 'strings', artefactsEdited: 'array', regArtefactsEdited: 'array',
  phaseSeq: 'array', regInclude: 'bool', lifecycleUse: 'bool', lifecyclePos: 'number', statusLifecycle: 'array', targetLocPct: 'objectOrNull', forceGlassCeiling: 'bool',
  scurve: 'object', engageCoef: 'object', MATURITY_MAP: 'object',
};
const plain = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v);

function shapeOf(ref: string): Shape {
  const p = parseRef(ref);
  return p && p.kind === 'top' ? (SHAPES[p.key] as Shape) : p?.kind === 'checked' ? 'bool' : 'array' /* unreachable for values.*: handled by the caller */;
}

function checkType(t: Tab, l: Line, ref: string, v: unknown): void {
  const p = parseRef(ref);
  const ok = p?.kind === 'values' ? typeof v === 'string' && v.length <= 2000 : ((): boolean => {
    switch (shapeOf(ref)) {
      case 'strings': return Array.isArray(v) && v.length <= 2000 && v.every((x) => typeof x === 'string' && x.length <= 200);
      case 'bool': return typeof v === 'boolean';
      case 'number': return typeof v === 'number' && Number.isFinite(v);
      case 'array': return Array.isArray(v) && v.length <= 5000;
      case 'object': return plain(v);
      default: return v === null || plain(v);
    }
  })();
  if (!ok) fail(t.name, l.n, `the value of "${ref}" has the wrong type`);
}

/**
 * Overrides sheet: product, key, part, JSON. The key must be on the whitelist (horizon, discountRate, khInfraMonthly, RATE, MODEL, COEF and prototype
 * keys are refused), the JSON valid and of the key's type.
 */
export function readOverrides(sheets: Sheets, ids: ReadonlySet<string>): { productId: string; ref: string; value: unknown }[] {
  const t = tab(sheets, PF_SHEETS.overrides);
  if (!t) return [];
  const parts = new Map<string, { id: string; ref: string; text: string; next: number; n: number }>();
  for (const l of t.lines) {
    const id = knownProduct(t, l, ids), ref = str(l.c[1]);
    if (!parseRef(ref) || /discountrate/i.test(ref)) fail(t.name, l.n, `"${ref.slice(0, 60)}" is not an overridable key`);
    const part = numberCell(t, l, 2, 'part', { min: 1, max: PF_LIMITS.overrideChunks, int: true }) as number, key = `${id}\u0000${ref}`, cur = parts.get(key);
    if (part === 1) { if (cur) fail(t.name, l.n, `duplicate override "${ref}" for product "${id}"`); parts.set(key, { id, ref, text: String(l.c[3] ?? ''), next: 2, n: l.n }); continue; }
    if (!cur || cur.next !== part) fail(t.name, l.n, `part ${part} of "${ref}" is out of sequence`);
    cur.text += String(l.c[3] ?? ''); cur.next++;
  }
  const perProduct = new Map<string, number>();
  return [...parts.values()].map((p) => {
    perProduct.set(p.id, (perProduct.get(p.id) ?? 0) + 1);
    if ((perProduct.get(p.id) as number) > PF_LIMITS.overridesPerProduct) fail(t.name, p.n, `too many overrides for product "${p.id}" (limit ${PF_LIMITS.overridesPerProduct})`);
    let value: unknown;
    try { value = sanitize(JSON.parse(p.text)); } catch { return fail(t.name, p.n, `the value of "${p.ref}" is not valid JSON`); }
    checkType(t, { n: p.n, c: [] }, p.ref, value);
    return { productId: p.id, ref: p.ref, value };
  });
}
