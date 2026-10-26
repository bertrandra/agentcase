import coefs from '@/content/refshare/datamodel-model.json';
import { COEF_DEFAULT } from '@/domain/catalog';
import { VARIABLES as REGISTRY } from '@/domain/pdc/variables';
import { SECTIONS } from '@/ui/zones/registry';
import type { Doc } from '@/store/types';

/** The live variable registry of the Board (`domain/pdc/variables.ts`), as rows. */
type VarRow = [id: string, label: string, format: string, unit: string, scope: string];
export const VARIABLES = REGISTRY.map((v): VarRow => [v.id, v.label, v.format, v.unit, v.scope]);

/** The authored meaning and home section of a coefficient / namespace, keyed by name (the keys themselves are read from the code). */
export const COEF_TEXT = new Map(coefs.coefficients.map((r) => [r[0] as string, { what: r[1] as string, home: r[3] as string }]));
export const NS_TEXT = new Map(coefs.namespaces.map((r) => [r[0] as string, { what: r[1] as string, home: r[2] as string }]));
/** One row per key of the code's default coefficients (`COEF_DEFAULT`): key, meaning, default, home section. */
export const COEF_ROWS = Object.keys(COEF_DEFAULT).map((k): [key: string, what: string, dflt: string, home: string] =>
  [k, COEF_TEXT.get(k)?.what ?? '', String(COEF_DEFAULT[k]), COEF_TEXT.get(k)?.home ?? '']);
/** One row per namespace of the live document's `MODEL`: name, meaning, home section. */
export const nsRows = (doc: Doc): [ns: string, what: string, home: string][] =>
  Object.keys((doc.MODEL ?? {}) as object).map((k) => { const ns = `MODEL.${k}`, t = NS_TEXT.get(ns); return [ns, t?.what ?? '', t?.home ?? '']; });

/** Sections counted by build-path tag, e.g. { drives: 22, reads: 13 … }. */
export function tagCounts(): [string, number][] {
  const m = new Map<string, number>();
  SECTIONS.forEach((s) => m.set(s.tag ?? '(none)', (m.get(s.tag ?? '(none)') ?? 0) + 1));
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export interface StateRow { key: string; type: string; size: string; preview: string }

/** Type, size and a short preview of a value (legacy dmDescribeValue / dmPreview). */
export function describe(v: unknown): { type: string; size: string; preview: string } {
  const type = v === null ? 'null' : v === undefined ? 'absent' : Array.isArray(v) ? 'array' : typeof v;
  const size = Array.isArray(v) ? `${v.length} items` : type === 'object' ? `${Object.keys(v as object).length} keys`
    : type === 'string' ? `${(v as string).length} chars` : type === 'number' || type === 'boolean' ? String(v) : '';
  const empty = v === null || v === undefined || (Array.isArray(v) && !v.length) || (type === 'object' && !Object.keys(v as object).length);
  const raw = empty ? 'empty' : type === 'object' ? Object.keys(v as object).slice(0, 4).join(', ') : Array.isArray(v) ? JSON.stringify(v[0]) : String(v);
  return { type, size, preview: raw.length > 70 ? `${raw.slice(0, 70)} …` : raw };
}

/** One row per key of the live document: its type, size and a short preview of the value. */
export function stateRows(doc: Doc): StateRow[] {
  return Object.keys(doc).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).map((key) => ({ key, ...describe(doc[key]) }));
}

/** Number of fields of a MODEL namespace and whether its phase flag is on (null when it has none). */
export function nsState(doc: Doc, ns: string): { fields: number; on: boolean | null } {
  const model = (doc.MODEL ?? {}) as Record<string, Record<string, unknown>>, name = ns.replace('MODEL.', '');
  const flags = model.FLAGS ?? {}, flag = name === 'FLAGS' ? undefined : flags[name.toLowerCase()];
  return { fields: Object.keys(model[name] ?? {}).length, on: typeof flag === 'boolean' ? flag : null };
}
