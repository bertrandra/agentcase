/**
 * Generates src/domain/catalog/defaultProcess.bpmn (docs/SPEC_BPMN.md § 6.3): the default process as native BPMN 2.0 XML, built from today's
 * catalogues (phases, artefacts, regulatory catalogue, loop pairs, skill map) with the scope of the default case (store/defaults/defaultDoc.json).
 * Stable serialisation: same catalogues, same bytes. Never edited by hand.
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
