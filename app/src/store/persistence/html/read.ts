/** @calc-zone exports */
import { resolveProduct } from '@/domain/portfolio';
import type { Portfolio } from '@/domain/portfolio';
import type { Doc } from '../../types';
import { openChecked } from '../schema';
import { SNAPSHOT_SCRIPT_ID } from './embed';

/** `portfolio` is what the file holds; `doc` is its active product's effective case (the whole case for a single-case file). */
export interface EmbeddedCase { portfolio: Portfolio; doc: Doc; savedAt: string; raw: unknown; /** corrections made to damaged values */ notes: string[] }

/** The case a saved HTML copy carries, read from its own script element (nothing is evaluated). Null when this is a plain build. */
export function readEmbeddedCase(d: Pick<Document, 'getElementById'>): EmbeddedCase | null {
  const el = d.getElementById(SNAPSHOT_SCRIPT_ID);
  if (!el) return null;
  const raw = JSON.parse(el.textContent ?? '') as Record<string, unknown>;
  const { portfolio, notes } = openChecked(raw);
  return { portfolio, doc: resolveProduct(portfolio, portfolio.activeProductId) as Doc, savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '', raw, notes };
}
