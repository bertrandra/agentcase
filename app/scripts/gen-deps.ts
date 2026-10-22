/**
 * Generates src/generated/dependencies.json: the zone / section dependency graph, built from the imports of the code (never by hand).
 * Usage (from app/): npm run deps:gen          writes the file
 *                    npm run deps:check        exits 1 when the committed file is stale
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildDeps, DEPS_FILE, formatDeps, STALE_MESSAGE } from './lib/build';

const root = process.cwd(), file = join(root, DEPS_FILE), next = formatDeps(buildDeps(root));
if (process.argv.includes('--check')) {
  if (!existsSync(file) || readFileSync(file, 'utf8') !== next) { console.error(STALE_MESSAGE); process.exit(1); }
  console.log(`${DEPS_FILE} is up to date.`);
} else {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, next);
  console.log(`${DEPS_FILE}: ${(next.length / 1024).toFixed(1)} KB`);
}
