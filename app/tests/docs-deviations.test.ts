import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEVIATIONS } from './helpers/deviations';

/** docs/DEVIATIONS.md is the one register of intentional differences from the legacy file (and of the recorded known defects). */
const doc = readFileSync('../docs/DEVIATIONS.md', 'utf8');
const ID = /DEV-[A-Z0-9]+(?:-[A-Z0-9]+)*/g;
const headings = [...doc.matchAll(/^## (DEV-[A-Z0-9-]+) /gm)].map((m) => m[1]!);
const indexRows = [...doc.matchAll(/^\| (DEV-[A-Z0-9-]+) \|/gm)].map((m) => m[1]!);
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
/** Ids that were renamed and are only mentioned as "replaces …". */
const RETIRED = ['DEV-SCENARIO-FLAT'];

describe('docs/DEVIATIONS.md register', () => {
  it('has one section per id and an index row for each, in the same order', () => {
    expect(new Set(headings).size).toBe(headings.length);
    expect(indexRows).toEqual(headings);
  });
  it('every DEV-* id cited by the changelog, the docs, the code, the tests or the ui-parity exceptions has a section', () => {
    const files = ['../CHANGELOG.md', 'ui-parity-exceptions.json', ...walk('../docs').filter((f) => f.endsWith('.md') && !f.includes('history')),
      ...walk('src'), ...walk('tests')]
      .filter((f) => /\.(md|json|ts|tsx|css)$/.test(f));
    const cited = new Set(files.flatMap((f) => readFileSync(f, 'utf8').match(ID) ?? []));
    expect([...cited].filter((id) => !headings.includes(id) && !RETIRED.includes(id) && !id.endsWith('-'))).toEqual([]);
  });
  it('the machine-readable twin (tests/helpers/deviations.ts) names only registered ids', () => {
    expect(DEVIATIONS.map((d) => d.id).filter((id) => !headings.includes(id))).toEqual([]);
  });
});
