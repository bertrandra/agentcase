import variables from '@/content/refshare/variables.json';
import coefs from '@/content/refshare/datamodel-model.json';
import { SECTIONS } from '@/ui/zones/registry';
import type { Doc } from '@/store/types';

export const VARIABLES = variables.rows as [id: string, label: string, format: string, unit: string, scope: string][];
export const COEF_ROWS = coefs.coefficients as [key: string, what: string, dflt: string, home: string][];
export const NS_ROWS = coefs.namespaces as [ns: string, what: string, home: string][];

/** Sections counted by build-path tag, e.g. { drives: 22, reads: 13 … }. */
export function tagCounts(): [string, number][] {
  const m = new Map<string, number>();
  SECTIONS.forEach((s) => m.set(s.tag ?? '(none)', (m.get(s.tag ?? '(none)') ?? 0) + 1));
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export interface StateRow { key: string; type: string; size: string; preview: string }

/** One row per key of the live document: its type, size and a short preview of the value (legacy dmDescribeValue / dmPreview). */
export function stateRows(doc: Doc): StateRow[] {
  return Object.keys(doc).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).map((key) => {
    const v = doc[key];
    const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    const size = Array.isArray(v) ? `${v.length} items` : type === 'object' ? `${Object.keys(v as object).length} keys` : type === 'string' ? `${(v as string).length} chars` : type === 'number' || type === 'boolean' ? String(v) : '';
    const empty = v === null || v === undefined || (Array.isArray(v) && !v.length) || (type === 'object' && !Object.keys(v as object).length);
    const raw = empty ? 'empty' : type === 'object' ? Object.keys(v as object).slice(0, 4).join(', ') : Array.isArray(v) ? JSON.stringify(v[0]) : String(v);
    return { key, type, size, preview: raw.length > 70 ? `${raw.slice(0, 70)} …` : raw };
  });
}

/** Number of fields of a MODEL namespace and whether its phase flag is on (null when it has none). */
export function nsState(doc: Doc, ns: string): { fields: number; on: boolean | null } {
  const model = (doc.MODEL ?? {}) as Record<string, Record<string, unknown>>, name = ns.replace('MODEL.', '');
  const flags = model.FLAGS ?? {}, flag = name === 'FLAGS' ? undefined : flags[name.toLowerCase()];
  return { fields: Object.keys(model[name] ?? {}).length, on: typeof flag === 'boolean' ? flag : null };
}
