import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { computeCase } from '@/domain';
import type { CaseState } from '@/domain';

const DIR = 'fixtures';
const ids = readdirSync(`${DIR}/expected`).map((f) => f.replace('.json', '')).sort();
const load = (kind: string, id: string) => JSON.parse(readFileSync(`${DIR}/${kind}/${id}.json`, 'utf8'));

/** Collect every mismatch between the oracle value and ours (numbers within 1e-6 relative; only keys the oracle has). */
export function diff(exp: unknown, got: unknown, path: string, out: string[]): void {
  if (typeof exp === 'number') {
    const ok = typeof got === 'number' && (Math.abs(got - exp) <= 1e-6 * Math.max(1, Math.abs(exp)) || (Number.isNaN(exp) && Number.isNaN(got)));
    if (!ok) out.push(`${path}: expected ${exp}, got ${String(got)}`);
  } else if (Array.isArray(exp)) {
    if (!Array.isArray(got) || got.length !== exp.length) out.push(`${path}: array length ${(got as unknown[])?.length} vs ${exp.length}`);
    else exp.forEach((v, i) => diff(v, got[i], `${path}[${i}]`, out));
  } else if (exp && typeof exp === 'object') {
    for (const k of Object.keys(exp)) diff((exp as Record<string, unknown>)[k], (got as Record<string, unknown> | undefined)?.[k], `${path}.${k}`, out);
  } else if (exp !== got) out.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
}

describe('domain engine reproduces the legacy oracle', () => {
  it('has fixtures', () => expect(ids.length).toBeGreaterThanOrEqual(30));
  it.each(ids)('%s', (id) => {
    const state = load('cases', id) as CaseState, exp = load('expected', id);
    const got = computeCase(state);
    const problems: string[] = [];
    diff(exp.model, JSON.parse(JSON.stringify(got.model, (_k, v) => (v === Infinity ? 'Infinity' : v))), 'model', problems);
    diff(exp.payback, got.payback, 'payback', problems);
    diff(exp.npv, got.npv, 'npv', problems);
    diff(exp.phaseScope, got.phaseScope, 'phaseScope', problems);
    diff(exp.glassCeiling, got.glassCeiling, 'glassCeiling', problems);
    expect(problems.slice(0, 12)).toEqual([]);
  });
});
