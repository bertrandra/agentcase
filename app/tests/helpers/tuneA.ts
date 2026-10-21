import { readdirSync, readFileSync } from 'node:fs';
import type { CaseState } from '@/domain';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fromSnapshot } from '@/store/persistence/snapshot';

/** Fixture ids that have the given oracle extra (tools/oracle-extras.d/tuneA.mjs). */
export const extraIds = (name: string): string[] => readdirSync(`fixtures/extras/${name}`).map((f) => f.replace('.json', '')).sort();
export const extra = <T = unknown>(name: string, id: string): T => JSON.parse(readFileSync(`fixtures/extras/${name}/${id}.json`, 'utf8')) as T;
export const caseJson = (id: string): CaseState => JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState;

/** Install a fixture case as the application store (what the UI reads and the controllers write). */
export function loadFixture(id: string) {
  const store = createAppStore(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))));
  setAppStore(store);
  return store;
}

/** Mismatches between the oracle value and ours (numbers within 1e-6 relative; only the keys the oracle has). */
export function diff(exp: unknown, got: unknown, path: string, out: string[] = []): string[] {
  if (typeof exp === 'number') {
    if (!(typeof got === 'number' && Math.abs(got - exp) <= 1e-6 * Math.max(1, Math.abs(exp)))) out.push(`${path}: expected ${exp}, got ${String(got)}`);
  } else if (Array.isArray(exp)) {
    if (!Array.isArray(got) || got.length !== exp.length) out.push(`${path}: array length ${Array.isArray(got) ? got.length : String(got)} vs ${exp.length}`);
    else exp.forEach((v, i) => diff(v, got[i], `${path}[${i}]`, out));
  } else if (exp && typeof exp === 'object') {
    for (const k of Object.keys(exp)) diff((exp as Record<string, unknown>)[k], (got as Record<string, unknown> | undefined)?.[k], `${path}.${k}`, out);
  } else if (exp !== got) out.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
  return out;
}
