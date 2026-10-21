import type { Doc } from '../../types';
import { fromSnapshot } from '../snapshot';
import { SNAPSHOT_SCRIPT_ID } from './embed';

export interface EmbeddedCase { doc: Doc; savedAt: string }

/** The case a saved HTML copy carries, read from its own script element (nothing is evaluated). Null when this is a plain build. */
export function readEmbeddedCase(d: Pick<Document, 'getElementById'>): EmbeddedCase | null {
  const el = d.getElementById(SNAPSHOT_SCRIPT_ID);
  if (!el) return null;
  const raw = JSON.parse(el.textContent ?? '') as Record<string, unknown>;
  return { doc: fromSnapshot(raw), savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '' };
}
