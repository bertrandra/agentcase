import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@/domain/version';
import { APP_PAGES, applyAppCounts, applyFacts, collectBlocks, collectFacts, FACT_DOCS, factKeys, STALE_MESSAGE } from '../scripts/lib/docFacts';
import { codeCounts } from '../scripts/lib/docFactsCode';

const app = process.cwd(), read = (f: string): string => readFileSync(join(app, f), 'utf8');

describe('documentation facts are generated (npm run docs:facts)', () => {
  const facts = collectFacts(app, codeCounts()), blocks = collectBlocks(app);
  it('every marked fact in the docs and the in-app architecture pages is up to date (the message tells what to run)', () => {
    const stale = [...FACT_DOCS.filter((f) => applyFacts(read(f), facts, blocks) !== read(f)),
      ...APP_PAGES.filter((f) => applyAppCounts(read(f), facts) !== read(f))];
    if (stale.length) throw new Error(`${STALE_MESSAGE} Stale: ${stale.join(', ')}`);
    expect(STALE_MESSAGE).toContain('npm run docs:facts');
  }, 90000);
  it('the documents carry the facts they quote: version, counts, release file name', () => {
    expect(factKeys(read('../docs/ARCHITECTURE.md'))).toEqual(expect.arrayContaining(
      ['version', 'srcFiles', 'testFiles', 'tests', 'commands', 'undoable', 'sections', 'groups', 'zones', 'figures', 'releaseFile', 'loaders']));
    expect(read('../docs/ARCHITECTURE.md')).toContain('<!-- facts:groupTable -->');
    expect(factKeys(read('../README.md'))).toEqual(expect.arrayContaining(['version', 'releaseFile', 'sections', 'commands']));
    expect(factKeys(read('README.md'))).toContain('version');
    expect(facts.version).toBe(APP_VERSION);
  });
  it('the facts equal the code: commands, sections and loaders agree', () => {
    expect(Number(facts.loaders)).toBe(Number(facts.sections));
    expect(Number(facts.commands)).toBe(Number(facts.undoable) + Number(facts.viewCommands));
    expect(['input', 'calc', 'result', 'shared'].reduce((a, l) => a + Number(facts[`${l}Zones`]), 0)).toBe(Number(facts.zones));
  });
});

describe('the facts generator', () => {
  const f = { version: '7.3.1', commands: '12' }, b = { groupTable: '| a | 1 |' };
  it('fills inline markers and blocks, idempotently', () => {
    const src = 'v<!-- fact:version -->1.0.0<!-- /fact --> has <!-- fact:commands -->3<!-- /fact -->\n<!-- facts:groupTable -->\n| old |\n| rows |\n<!-- /facts -->\nend';
    const out = applyFacts(src, f, b);
    expect(out).toBe('v<!-- fact:version -->7.3.1<!-- /fact --> has <!-- fact:commands -->12<!-- /fact -->\n<!-- facts:groupTable -->\n| a | 1 |\n<!-- /facts -->\nend');
    expect(applyFacts(out, f, b)).toBe(out);
  });
  it('keeps the cached value of a volatile fact (the number of tests) and refuses an unknown key', () => {
    expect(applyFacts('about <!-- fact:tests -->16,000<!-- /fact --> tests', f)).toBe('about <!-- fact:tests -->16,000<!-- /fact --> tests');
    expect(applyFacts('<!-- fact:tests -->1<!-- /fact -->', { ...f, tests: '2' })).toBe('<!-- fact:tests -->2<!-- /fact -->');
    expect(() => applyFacts('<!-- fact:nope -->1<!-- /fact -->', f)).toThrow(/unknown fact "nope"/);
    expect(() => applyFacts('<!-- facts:nope -->\nx\n<!-- /facts -->', f, b)).toThrow(/unknown facts block/);
  });
  it('rewrites the count phrases of the in-app pages and nothing else', () => {
    const facts = { sections: '90', groups: '16', commands: '250', undoable: '245', zones: '19' };
    expect(applyAppCounts('86 sections in 15 groups; 247 commands, 243 of them undoable; 18 zones; 3 years', facts))
      .toBe('90 sections in 16 groups; 250 commands, 245 of them undoable; 19 zones; 3 years');
  });
});
