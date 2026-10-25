import { readdirSync, readFileSync } from 'node:fs';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { legacyMoney } from './deviations';
import { legacySectionText } from './parity';
import { fromSnapshot } from '@/store/persistence/snapshot';

/** Every oracle fixture the legacy economics extras were recorded for. */
export const FIXTURES = readdirSync('fixtures/extras/econ_dom').map((f) => f.replace('.json', '')).sort();
/** The four fixtures whose legacy section text is checked number by number. */
export const PARITY_FIXTURES = ['golden', 'ctx-msi', 'curve-logistic', 'industry-med'];

/**
 * Legacy section text with cell separators made explicit. The tab / newline that separated two cells would otherwise fuse them in
 * `numberTokens` ("Year 3<TAB>100%" reads as 3 100 = 3100, "€-15,379<LF>M2" reads as millions); the rendered text never has that artefact.
 */
export function legacyText(fixture: string, section: string): string | null {
  const t = legacySectionText(fixture, section);
  return t === null ? null : t.replace(/[\t\n]+/g, ' | ');
}

const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
/** Install a store holding the oracle case `id` as the application store. */
export function loadFixture(id: string) { const s = createAppStore(fromSnapshot(json(`fixtures/cases/${id}.json`))); setAppStore(s); return s; }
/** A legacy extra recorded by tools/oracle-extras.d/economics.mjs. */
export const extra = <T = unknown>(name: string, id: string): T => json(`fixtures/extras/${name}/${id}.json`) as T;

/** Compare numbers within 1e-6 relative, everything else exactly; collects the differences. */
export function diffs(exp: unknown, got: unknown, path = '', out: string[] = []): string[] {
  if (typeof exp === 'number') {
    const g = got as number;
    if (typeof got !== 'number' || !(Math.abs(g - exp) <= 1e-6 * Math.max(1, Math.abs(exp)))) out.push(`${path}: expected ${exp}, got ${String(got)}`);
  } else if (Array.isArray(exp)) {
    if (!Array.isArray(got) || got.length !== exp.length) out.push(`${path}: length ${Array.isArray(got) ? got.length : '?'} vs ${exp.length}`);
    else exp.forEach((v, i) => diffs(v, got[i], `${path}[${i}]`, out));
  } else if (exp && typeof exp === 'object') for (const k of Object.keys(exp)) diffs((exp as Record<string, unknown>)[k],
    (got as Record<string, unknown> | undefined)?.[k], `${path}.${k}`, out);
  else if (exp !== got
    && !(typeof exp === 'string' && legacyMoney(exp) === got)) out.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
  return out;
}

const text = (e: Element) => (e.textContent ?? '').trim();
/** Cell text of every table under `root`: tables → rows → cells (header row included). */
export const tablesOf = (root: Element): string[][][] =>
  [...root.querySelectorAll('table')].map((t) => [...t.querySelectorAll('tr')].map((r) => [...r.children].map(text)));
/** [label, value] of every figure (`Stat`) under `root`. */
export const statsOf = (root: Element): string[][] => [...root.querySelectorAll('.ac-stat')].map((s) => [text(s.querySelector('.ac-stat-l') as Element),
  text(s.querySelector('.ac-stat-v') as Element)]);
/** Value of the figure labelled `label`. */
export const statValue = (root: Element, label: string): string | undefined => statsOf(root).find((s) => s[0] === label)?.[1];
export const squash = (s: string): string => legacyMoney(s.replace(/\s+/g, ''));

/** Legacy tables / bands that the rendered tree does not reproduce cell for cell (empty = identical). */
export function missingCells(root: Element, legacy: { T?: Record<string, string[][]>; B?: Record<string, string[][]> },
  names: { tables?: string[]; bands?: string[] }): string[] {
  const tables = tablesOf(root).map((t) => JSON.stringify(t)), stats = statsOf(root).map((s) => JSON.stringify(s)), out: string[] = [];
  for (const n of names.tables ?? []) if (!tables.includes(legacyMoney(JSON.stringify(legacy.T?.[n])))) out.push(`table ${n}`);
  for (const n of names.bands ?? []) for (const p of legacy.B?.[n]
    ?? []) if (!stats.includes(legacyMoney(JSON.stringify(p)))) out.push(`band ${n}: ${JSON.stringify(p)}`);
  return out;
}
