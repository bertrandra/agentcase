import { diagnose } from './diagnostics';
import { FORBIDDEN_DOM_IDS, OVERRIDABLE_KEYS, type Portfolio } from './types';

export interface Issue { code: string; message: string; productId?: string; waveId?: string }
export interface Validation { errors: Issue[]; diagnostics: Issue[] }

const nonNeg = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const dupes = (ids: string[]): string[] => ids.filter((x, i) => ids.indexOf(x) !== i);

/** Invariants of spec 4.1 (errors: the document is not valid) and the diagnostics a valid document can still raise. */
export function validate(pf: Portfolio): Validation {
  const errors: Issue[] = [], err = (code: string, message: string, ref: Partial<Issue> = {}) => errors.push({ code, message, ...ref });
  if (pf.products.length < 1) err('no-product', 'a portfolio needs at least one product');
  for (const id of dupes(pf.products.map((p) => p.id))) err('dup-product-id', `duplicate product id ${id}`, { productId: id });
  for (const id of dupes(pf.waves.map((w) => w.id))) err('dup-wave-id', `duplicate wave id ${id}`, { waveId: id });
  if (!pf.products.some((p) => p.id === pf.activeProductId)) err('active-unknown', `active product ${pf.activeProductId} does not exist`);
  if (!Number.isInteger(pf.horizonMonths) || pf.horizonMonths < 1) err('horizon', 'horizonMonths must be a positive integer');
  if (!nonNeg(pf.hub.infraMonthly)) err('hub-infra', 'hub infrastructure must be a number >= 0');
  const listed = new Map<string, string[]>();
  for (const w of pf.waves) {
    if (!nonNeg(w.startMonth)) err('wave-start', `wave ${w.id}: startMonth must be >= 0`, { waveId: w.id });
    for (const pid of w.productIds) listed.set(pid, [...(listed.get(pid) ?? []), w.id]);
  }
  for (const p of pf.products) {
    const ref = { productId: p.id }, k = p.knowledge, inWaves = listed.get(p.id) ?? [];
    if (inWaves.length > 1) err('multi-wave', `product ${p.id} is listed in ${inWaves.length} waves`, ref);
    if (p.waveId !== null && !inWaves.includes(p.waveId)) err('wave-mismatch', `product ${p.id}: waveId ${p.waveId} does not list it`, ref);
    if (p.waveId === null && inWaves.length) err('wave-mismatch', `product ${p.id} has no wave but wave ${inWaves[0]} lists it`, ref);
    if (!nonNeg(p.offsetMonths)) err('offset', `product ${p.id}: offsetMonths must be >= 0`, ref);
    if (k.ktLeadMonths !== undefined && !nonNeg(k.ktLeadMonths)) err('kt-lead', `product ${p.id}: ktLeadMonths must be >= 0`, ref);
    if (k.targetCC !== undefined && !(k.targetCC >= 0 && k.targetCC <= 4)) err('target-cc', `product ${p.id}: targetCC must be in [0, 4]`, ref);
    if (k.domains?.length && Math.abs(k.domains.reduce((a, d) => a + d.weightPct, 0) - 100) > 1e-6) err('domain-weights', `product ${p.id}: domain weights must add up to 100`, ref);
    if (k.maturityAnswers && (k.maturityAnswers.length !== 9 || k.maturityAnswers.some((n) => !(n >= 0 && n <= 4)))) err('maturity', `product ${p.id}: 9 answers in [0, 4] expected`, ref);
    const o = p.overrides as Record<string, unknown>;
    for (const key of Object.keys(o)) if (key !== 'dom' && !(OVERRIDABLE_KEYS as readonly string[]).includes(key)) err('override-key', `product ${p.id}: "${key}" is not overridable`, ref);
    for (const id of [...Object.keys(p.overrides.dom?.values ?? {}), ...Object.keys(p.overrides.dom?.checked ?? {})]) {
      if (FORBIDDEN_DOM_IDS.includes(id)) err('override-key', `product ${p.id}: "${id}" is never overridden`, ref);
    }
  }
  const diagnostics = errors.length ? [] : diagnose(pf);
  return { errors, diagnostics };
}
