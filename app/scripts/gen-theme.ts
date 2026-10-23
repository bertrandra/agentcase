/**
 * Writes the default theme into src/ui/theme/tokens.css (the block between the `@generated` markers) from the token table of src/domain/theme.
 * Usage (from app/): npm run theme:gen          rewrites the block
 *                    npm run theme:check        exits 1 when tokens.css is stale (tests/ui/theme-tokens.test.ts checks the same)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOKENS_FILE, withTokens } from './lib/theme';

const file = join(process.cwd(), TOKENS_FILE), css = readFileSync(file, 'utf8'), next = withTokens(css);
if (process.argv.includes('--check')) {
  if (css !== next) { console.error(`${TOKENS_FILE} is stale: run npm run theme:gen`); process.exit(1); }
  console.log(`${TOKENS_FILE} is up to date.`);
} else {
  writeFileSync(file, next);
  console.log(`${TOKENS_FILE}: ${next.split('\n').length} lines`);
}
