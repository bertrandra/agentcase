import { existsSync, readdirSync, readFileSync } from 'node:fs';

/** Every mismatch between the legacy value and ours (numbers within `tol` relative; only keys the legacy value has). */
export function diffValues(exp: unknown, got: unknown, path: string, out: string[] = [], tol = 1e-6): string[] {
  if (exp === 'Infinity') { if (got !== Infinity && got !== 'Infinity') out.push(`${path}: expected Infinity, got ${String(got)}`); }
  else if (typeof exp === 'number') {
    const ok = typeof got === 'number' && (Math.abs(got - exp) <= tol * Math.max(1, Math.abs(exp)) || (Number.isNaN(exp) && Number.isNaN(got)));
    if (!ok) out.push(`${path}: expected ${exp}, got ${String(got)}`);
  } else if (Array.isArray(exp)) {
    if (!Array.isArray(got) || got.length !== exp.length) out.push(`${path}: array length ${(got as unknown[] | undefined)?.length} vs ${exp.length}`);
    else exp.forEach((v, i) => diffValues(v, got[i], `${path}[${i}]`, out, tol));
  } else if (exp && typeof exp === 'object') {
    for (const k of Object.keys(exp)) diffValues((exp as Record<string, unknown>)[k], (got as Record<string, unknown> | undefined)?.[k], `${path}.${k}`, out,
      tol);
  } else if (exp !== got) out.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
  return out;
}

/** Fixture ids that carry the oracle extra `name` (written by tools/oracle.mjs from tools/oracle-extras.d). */
export const extraIds = (name: string): string[] =>
  existsSync(`fixtures/extras/${name}`) ? readdirSync(`fixtures/extras/${name}`).map((f) => f.replace('.json', '')).sort() : [];
export const loadExtra = <T = unknown>(name: string, id: string): T => JSON.parse(readFileSync(`fixtures/extras/${name}/${id}.json`, 'utf8')) as T;
export const loadCase = <T = unknown>(id: string): T => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as T;
/** A copy without the given keys at any depth. */
export function omitDeep(v: unknown, keys: string[]): unknown {
  if (Array.isArray(v)) return v.map((x) => omitDeep(x, keys));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !keys.includes(k)).map(([k, x]) => [k, omitDeep(x, keys)]));
  return v;
}
/** Keep only `keys` of an object (the legacy read-outs carry more fields than the ported ones). */
export const pick = <T extends object>(o: T,
  keys: string[]): Partial<T> => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, (o as Record<string, unknown>)[k]])) as Partial<T>;
