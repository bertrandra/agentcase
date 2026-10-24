/** @calc-zone exports */
import { envelopeCase } from '@/domain/portfolio';
import { carriedPersona, DEFAULT_PERSONA } from '../../persona';
import type { PortfolioDoc } from '../../types';
import { readPortfolio } from '../portfolioRead';
import { fromSnapshot, sanitize, SnapshotError } from '../snapshot';
import { checkCase, rec } from './caseChecks';
import { repairPortfolio } from './portfolioChecks';
import { migrate } from './version';

export { MIGRATIONS, NewerFileError, SNAPSHOT_SCHEMA_VERSION, VERSION_KEY, migrate, versionStamp } from './version';

const PORTFOLIO_TAG = 'agentcase.portfolio.v1';

/** What opening a file gives: the work, and the corrections made to damaged values (empty for a sound file). */
export interface Opened { portfolio: PortfolioDoc; notes: string[] }

/**
 * THE OPEN PIPELINE of every saved file (JSON, HTML snapshot, autosave record, embedded case): sanitise -> migrate to the current schema ->
 * validate and correct the critical values (each correction is a note) -> the strict readers. It throws only for what is not an AgentCase file
 * (not a JSON object, no form inputs and no portfolio tag) and for a file from a newer build (`NewerFileError`); a damaged file opens corrected.
 * The file's `currentPersona` (else the default) is the persona it opens on (view state, `store/persona.ts`).
 */
export function openChecked(raw: unknown): Opened {
  if (!rec(raw)) throw new SnapshotError('Snapshot must be a JSON object');
  const notes: string[] = [], s = migrate(sanitize(raw));
  if (s._schema === PORTFOLIO_TAG) {
    const fixed = repairPortfolio(s, notes);
    return { portfolio: { ...readPortfolio(fixed), persona: carriedPersona(fixed.common) ?? DEFAULT_PERSONA }, notes };
  }
  if (s.dom === undefined) throw new SnapshotError('This file holds no AgentCase case (no form inputs)');
  const fixed = checkCase(s, notes);
  return { portfolio: { ...envelopeCase(fromSnapshot(fixed)), persona: carriedPersona(fixed) ?? DEFAULT_PERSONA }, notes };
}

/** "Opened with N corrections" — the summary line of the notes (null when there is none). */
export const correctionsSummary = (notes: readonly string[]): string | null =>
  (notes.length ? `Opened with ${notes.length} correction${notes.length === 1 ? '' : 's'}` : null);
