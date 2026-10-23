/**
 * Writes the default theme into src/ui/theme/tokens.css (the block between the `@generated` markers) from the token table of src/domain/theme,
 * and the theme axes into src/ui/theme/axes.css (whole file, T3).
 * Usage (from app/): npm run theme:gen          rewrites the block
 *                    npm run theme:check        exits 1 when tokens.css or axes.css is stale (tests/ui/theme-tokens.test.ts checks the same)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOKENS_FILE, withTokens } from './lib/theme';
import { AXES_FILE, axesFile } from './lib/themeAxes';

const file = join(process.cwd(), TOKENS_FILE), css = readFileSync(file, 'utf8'), next = withTokens(css);
if (process.argv.includes('--check')) {
  if (css !== next) { console.error(`${TOKENS_FILE} is stale: run npm run theme:gen`); process.exit(1); }
  console.log(`${TOKENS_FILE} is up to date.`);
} else {
  writeFileSync(file, next);
  console.log(`${TOKENS_FILE}: ${next.split('\n').length} lines`);
}

// T3: the theme axes (axes.css), generated in full; additive to the tokens block above
const axesPath = join(process.cwd(), AXES_FILE), axesNext = axesFile(), axesCur = existsSync(axesPath) ? readFileSync(axesPath, 'utf8') : '';
if (process.argv.includes('--check')) {
  if (axesCur !== axesNext) { console.error(`${AXES_FILE} is stale: run npm run theme:gen`); process.exit(1); }
  console.log(`${AXES_FILE} is up to date.`);
} else {
  writeFileSync(axesPath, axesNext);
  console.log(`${AXES_FILE}: ${axesNext.split('\n').length} lines`);
}
