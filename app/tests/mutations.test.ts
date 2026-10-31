// The mutations of `npm run validate:affected` (nightly job "affected") stay applicable: each `find` occurs exactly once in its file, and the
// mutated text differs. A refactor that removes the text fails here, in the pull-request gate, instead of stopping the nightly job (FX-75).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MUTATIONS } from '../scripts/lib/mutations';

const root = join(__dirname, '..');

describe('validate:affected mutations', () => {
  it.each(MUTATIONS.map((m) => [m.file, m] as const))('%s: find occurs once and the replacement differs', (_, m) => {
    expect(readFileSync(join(root, m.file), 'utf8').split(m.find).length - 1).toBe(1);
    expect(m.replace).not.toBe(m.find);
  });
});
