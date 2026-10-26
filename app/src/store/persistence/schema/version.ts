/** @calc-zone exports */
import { SnapshotError } from '../errors';

/**
 * THE FILE SCHEMA VERSION. Every file this build writes (JSON, HTML snapshot, autosave record) carries `_schemaVersion`; a file without it is v1
 * (every file written before files were stamped). Opening runs the migration chain from the file's version up to the current one, so a reader only ever sees
 * the current shape. A file from a newer build is refused with a clear message (its shape is unknown, guessing could lose data).
 *
 * Adding a version: bump `SNAPSHOT_SCHEMA_VERSION`, add `MIGRATIONS[n]` (vn -> vn+1, a pure function on the raw JSON) and a test that an old file
 * still opens to the same case. A migration never throws: what it cannot convert, it leaves to the validators (`checks`), which note a correction.
 */
export const SNAPSHOT_SCHEMA_VERSION = 2;
export const VERSION_KEY = '_schemaVersion';

/** A file made by a newer AgentCase: refused, the user is told to open it with an up-to-date build. */
export class NewerFileError extends SnapshotError {
  constructor(readonly version: number) {
    super(
      `This file was made with a newer AgentCase (file format v${version}; this version reads up to v${SNAPSHOT_SCHEMA_VERSION}). Open it with an ` +
        `up-to-date AgentCase.`);
  }
}

type Raw = Record<string, unknown>;
const KNOWN_PORTFOLIO = 'agentcase.portfolio.v1';

/**
 * v1 -> v2. v2 is the shape written since files carry `_schemaVersion`: identical to v1 but stamped. Normalised legacy spellings: a portfolio
 * `_schema` written with other letter case or spaces (hand-edited files) is read as the portfolio tag. A no-op for every file this app or the legacy
 * app wrote.
 */
function v1ToV2(s: Raw): Raw {
  const tag = typeof s._schema === 'string' ? s._schema.trim().toLowerCase() : s._schema;
  return tag === KNOWN_PORTFOLIO && s._schema !== KNOWN_PORTFOLIO ? { ...s, _schema: KNOWN_PORTFOLIO } : s;
}

/** `MIGRATIONS[n]` turns a version-n file into a version n+1 file. */
export const MIGRATIONS: Record<number, (s: Raw) => Raw> = { 1: v1ToV2 };

/** The version a raw file declares: absent (every file written before the stamp) = 1; anything that is not a whole number >= 1 is read as 1 too. */
export function fileVersion(raw: Raw): number {
  const v = raw[VERSION_KEY];
  return Number.isInteger(v) && (v as number) >= 1 ? (v as number) : 1;
}

/** Bring a raw file (already sanitised) to the current version. Throws `NewerFileError` for a file from the future; never otherwise. */
export function migrate(raw: Raw): Raw {
  const from = fileVersion(raw);
  if (from > SNAPSHOT_SCHEMA_VERSION) throw new NewerFileError(from);
  let s = raw;
  for (let v = from; v < SNAPSHOT_SCHEMA_VERSION; v++) s = (MIGRATIONS[v] as (x: Raw) => Raw)(s);
  const out = { ...s };
  delete out[VERSION_KEY];
  return out;
}

/** The stamp every written file carries. */
export const versionStamp = (): Raw => ({ [VERSION_KEY]: SNAPSHOT_SCHEMA_VERSION });
