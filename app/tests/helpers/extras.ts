import { existsSync, readdirSync, readFileSync } from 'node:fs';
import type { CaseState } from '@/domain';
import { legacyNames, withoutDeviations } from './deviations';

const DIR = 'fixtures';
/** Fixture ids that have an oracle extra of this name (fixtures/extras/<name>/<id>.json). */
export const extraIds = (name: string): string[] =>
  existsSync(`${DIR}/extras/${name}`) ? readdirSync(`${DIR}/extras/${name}`).map((f) => f.replace('.json', '')).sort() : [];
export const loadExtra = (name: string, id: string): unknown => JSON.parse(readFileSync(`${DIR}/extras/${name}/${id}.json`, 'utf8'));
export const loadCase = (id: string): CaseState => JSON.parse(readFileSync(`${DIR}/cases/${id}.json`, 'utf8')) as CaseState;

/** Mismatches between an oracle value and ours (numbers within 1e-6 relative; JSON null = non-finite number; 'Infinity' string = Infinity). */
export function diff(exp: unknown, got: unknown, path: string, out: string[]): void {
  if (exp === 'Infinity') { if (got !== Infinity) out.push(`${path}: expected Infinity, got ${String(got)}`); return; }
  if (exp === null) { if (got != null && !(typeof got === 'number' && !isFinite(got))) out.push(`${path}: expected null, got ${JSON.stringify(got)}`); return; }
  if (typeof exp === 'number') {
    if (!(typeof got === 'number' && Math.abs(got - exp) <= 1e-6 * Math.max(1, Math.abs(exp)))) out.push(`${path}: expected ${exp}, got ${String(got)}`);
  } else if (Array.isArray(exp)) {
    if (!Array.isArray(got) || got.length !== exp.length) out.push(`${path}: array length ${(got as unknown[] | undefined)?.length} vs ${exp.length}`);
    else exp.forEach((v, i) => diff(v, got[i], `${path}[${i}]`, out));
  } else if (exp && typeof exp === 'object') {
    for (const k of Object.keys(exp)) diff((exp as Record<string, unknown>)[k], (got as Record<string, unknown> | undefined)?.[k], `${path}.${k}`, out);
  } else if (exp !== got) out.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
}

/** Expect `got` to match the oracle extra `name` of fixture `id`; returns the problems (an empty list is a pass). */
export function problems(name: string, id: string, got: unknown): string[] {
  const out: string[] = [];
  diff(loadExtra(name, id), legacyNames(got), name, out);
  return withoutDeviations(out).slice(0, 10);   // registered deviations (docs/DEVIATIONS.md) are asserted by their own tests
}
