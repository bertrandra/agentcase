/**
 * The round-trip check of src/domain/catalog/defaultProcess.bpmn (docs/SPEC_BPMN.md § 6.3). Since SPEC_FIXES FX-02 (D-B9 (b)) the shipped file is
 * the ONE source of the catalogue: the catalogue lists are read from it (`catalog/index.ts`), and this script rebuilds the file from those lists
 * (with the skill map and the default case's scope) — `--check` proves the reading is lossless (same bytes). `process:gen` rewrites the file
 * after an intended change of the generator's layout; an edit of the catalogue is an edit of the .bpmn itself.
 * Usage (from app/): npm run process:gen          rewrites the file
 *                    npm run process:check        exits 1 when the committed file differs (tests/domain/process/default-process.test.ts too)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { DEFAULT_PROCESS_FILE, defaultProcessText } from './lib/defaultProcess';

const file = join(process.cwd(), DEFAULT_PROCESS_FILE), next = defaultProcessText();
const size = `${(Buffer.byteLength(next) / 1024).toFixed(1)} KB raw, ${(gzipSync(next, { level: 9 }).length / 1024).toFixed(1)} KB gzipped`;
if (process.argv.includes('--check')) {
  if (!existsSync(file) || readFileSync(file, 'utf8') !== next) { console.error(`${DEFAULT_PROCESS_FILE} is stale: run npm run process:gen`); process.exit(1); }
  console.log(`${DEFAULT_PROCESS_FILE} is up to date (${size}).`);
} else {
  writeFileSync(file, next);
  console.log(`${DEFAULT_PROCESS_FILE}: ${size}`);
}
