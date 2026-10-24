/**
 * Writes the facts the documentation quotes (version, counts) into docs/ARCHITECTURE.md, the READMEs and the in-app architecture pages
 * (scripts/lib/docFacts.ts says how). Usage (from app/):
 *   npm run docs:facts                       rewrites the marked values (keeps the cached number of tests)
 *   npm run docs:facts -- --count-tests      also runs the full Vitest suite once and records "about N tests" with the date
 *   npm run docs:facts -- --check            exits 1 when a document is stale (tests/docs-facts.test.ts checks the same in `npm run check`)
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APP_PAGES, applyAppCounts, applyFacts, collectBlocks, collectFacts, FACT_DOCS, STALE_MESSAGE } from './lib/docFacts';
import { codeCounts } from './lib/docFactsCode';

const app = process.cwd(), check = process.argv.includes('--check');
const facts = collectFacts(app, codeCounts()), blocks = collectBlocks(app);

if (process.argv.includes('--count-tests')) {
  const out = join(mkdtempSync(join(tmpdir(), 'docfacts-')), 'vitest.json');
  try { execSync(`npx vitest run --reporter=json --outputFile=${out}`, { stdio: 'inherit' }); } catch { /* failing tests still count */ }
  const r = JSON.parse(readFileSync(out, 'utf8')) as { numTotalTests: number };
  facts.tests = r.numTotalTests.toLocaleString('en-US');
  facts.testsCounted = new Date().toISOString().slice(0, 10);
}

const stale: string[] = [];
for (const [rel, next] of [
  ...FACT_DOCS.map((f) => [f, applyFacts(readFileSync(join(app, f), 'utf8'), facts, blocks)] as const),
  ...APP_PAGES.map((f) => [f, applyAppCounts(readFileSync(join(app, f), 'utf8'), facts)] as const),
]) {
  if (readFileSync(join(app, rel), 'utf8') === next) continue;
  stale.push(rel);
  if (!check) writeFileSync(join(app, rel), next);
}
if (check && stale.length) { console.error(`${STALE_MESSAGE}\n  ${stale.join('\n  ')}`); process.exit(1); }
console.log(stale.length ? `updated: ${stale.join(', ')}` : 'documentation facts are up to date');
console.log(Object.entries(facts).map(([k, v]) => `${k}=${v}`).join(' '));
