import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import catalog from '@/ui/zones/data/sectionCatalog.json';
import scope from '@/ui/zones/data/sectionScope.json';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import coef from '@/domain/catalog/coef.json';
import zoneCatalog from '@/domain/zones/catalog.json';
import { MAX_PRODUCTS } from '@/domain/portfolio';
import { VARIABLES } from '@/domain/pdc/variables';
import { LIMITS } from '@/store/persistence/excel/params/safe';
import { COALESCE_MS, HISTORY_CAP } from '@/store/history';
import { APP_VERSION } from '@/domain/version';
import { COMMAND_REGISTRY } from '@/store/commands';
import { codeStrings, goTargets, PAGES, textOf } from '../helpers/archContent';
import.meta.glob('/src/controllers/*.ts', { eager: true });   // registers every command, as tests/store/registry.test.ts does

// DEV-ARCH-CONTENT: the architecture pages describe the TypeScript build, not the legacy file, so these facts replace the old legacy-text parity.
// Their section / group / command / zone counts are rewritten by `npm run docs:facts` (scripts/lib/docFacts.ts); tests/docs-facts.test.ts checks they
// are fresh.
const APP = process.cwd(), REPO = resolve(APP, '..');
const text = textOf(PAGES['arch-content']), both = `${textOf(PAGES['arch-layers'])} ${text}`;
const nums = (re: RegExp, s = both): number[] => [...s.matchAll(re)].map((m) => Number((m[1] ?? '').replace(/,/g, '')));
const count = (d: string): number => readdirSync(join(APP, d)).length;

describe('architecture pages: pinned facts', () => {
  it('section and group counts equal the catalogue', () => {
    const sections = nums(/(\d+) sections\b/g), groups = nums(/(\d+) groups\b/g);
    expect(sections.length).toBeGreaterThan(2);
    expect(new Set(sections)).toEqual(new Set([catalog.length]));
    expect(catalog.length).toBe(86);
    expect(new Set(groups)).toEqual(new Set([new Set(catalog.map((s) => s.group)).size]));
  });
  it('command, variable, key and coefficient counts equal the code', () => {
    expect(new Set(nums(/(\d+) commands\b/g))).toEqual(new Set([COMMAND_REGISTRY.size]));
    expect(nums(/(\d+) bindable outputs/g)).toEqual([VARIABLES.length, VARIABLES.length]);
    expect(new Set(nums(/(\d+) top-level keys/g))).toEqual(new Set([Object.keys(defaultDoc).length]));
    expect(new Set(nums(/(\d+) embedded coefficients/g))).toEqual(new Set([Object.keys(coef).length]));
    expect(nums(/(\d+) of them undoable/g)).toEqual([[...COMMAND_REGISTRY.values()].filter((c) => c.undoable).length]);
    expect(new Set(nums(/(\d+) zones\b/g))).toEqual(new Set([zoneCatalog.zones.length]));
  });
  it('fixture counts equal the files on disk', () => {
    const cases = count('fixtures/cases');
    expect(cases).toBe(107);
    expect(new Set(nums(/(\d+) (?:cases|fixtures|case files)\b/g))).toEqual(new Set([cases]));
    expect(nums(/(\d+) named extra/g)).toEqual([count('fixtures/extras')]);
    expect(count('fixtures/expected')).toBe(cases);
  });
  it('limits quoted in the text equal the constants', () => {
    expect(nums(/1 to (\d+) products/g).every((n) => n === MAX_PRODUCTS)).toBe(true);
    expect(nums(/at most (\d+) steps/g)).toEqual([HISTORY_CAP]);
    expect(nums(/within (\d+) ms merge/g)).toEqual([COALESCE_MS]);
    expect(nums(/last (\d+) records/g)).toEqual([Number(/auditCap \?\? (\d+)/.exec(readFileSync(join(APP, 'src/store/core.ts'), 'utf8'))?.[1])]);
    expect(text).toContain(`${LIMITS.fileBytes / 2 ** 20} MB file, ${LIMITS.unzippedBytes / 2 ** 20} MB unzipped, ${LIMITS.entries} entries, compression ratio ${LIMITS.ratio}`);
    expect(text).toContain(`${LIMITS.rows.toLocaleString('en-US')} rows, ${LIMITS.cols} columns, ${LIMITS.text.toLocaleString('en-US')} characters`);
  });
  it('the version is not hard-coded', () => {
    const [maj, min] = APP_VERSION.split('.');
    expect(both).not.toMatch(/\bv?\d+\.\d+\.\d+\b/);
    expect(both).not.toContain(`v${maj}.${min}`);
  });
  it('layers named in the text exist on disk and are the four ESLint layers', () => {
    const cfg = readFileSync(join(APP, 'eslint.config.js'), 'utf8');
    for (const l of ['ui', 'controllers', 'store', 'domain']) { expect(existsSync(join(APP, 'src', l))).toBe(true); expect(cfg).toContain(`pattern: 'src/${l}/**'`); }
    for (const w of ['ui → controllers → store → domain']) expect(textOf(PAGES['arch-layers'])).toContain(w);
  });
  it('every path in a code element exists', () => {
    const bad: string[] = [], seen = new Set<string>();
    for (const page of Object.values(PAGES)) for (const raw of codeStrings(page)) {
      const s = raw.replace(/#.*$/, '').replace(/^@\//, '');
      if (s.startsWith('.') || s === 'boundaries/element-types' || !/^[\w.\-/]+$/.test(s) || !(s.includes('/') || /\.(ts|tsx|json|mjs|md|js)$/.test(s)) || /^\d/.test(s) || seen.has(s)) continue;
      seen.add(s);
      if (![join(APP, 'src', s), join(APP, 'src', `${s}.ts`), join(APP, s), join(REPO, s), join(REPO, 'docs', s)].some(existsSync)) bad.push(s);
    }
    expect(bad).toEqual([]);
    expect(seen.size).toBeGreaterThan(60);
  });
  it('every document referenced by name exists', () => {
    for (const d of text.match(/docs\/[A-Z_]+\.md/g) ?? []) expect(existsSync(join(REPO, d)), d).toBe(true);
    expect(existsSync(join(REPO, 'CHANGELOG.md'))).toBe(true);
  });
  it('every go link targets a catalogue section; both pages stay S-static', () => {
    const ids = new Set(catalog.map((s) => s.id));
    for (const [id, page] of Object.entries(PAGES)) {
      const t = goTargets(page);
      expect(t.length).toBeGreaterThan(0);
      for (const to of t) expect(ids.has(to), `${id} -> ${to}`).toBe(true);
      expect((scope as Record<string, string>)[id]).toBe('S-static');
    }
    expect(goTargets(PAGES['arch-content'])).toEqual(expect.arrayContaining(['datamodel', 'deps', 'calcengine', 'glossary', 'io', 'sessions', 'consolidation', 'products', 'arch-layers']));
    expect(goTargets(PAGES['arch-layers'])).toContain('arch-content');
  });
});
