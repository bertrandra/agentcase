/** @calc-zone foundation */
import { scopeExists, type Portfolio } from '@/domain/portfolio';
import type { PortfolioDoc } from './types';

/**
 * THE CURRENT PERSONA IS VIEW STATE OF THE TAB (decision D3): `PortfolioDoc.persona`, one of `VIEW_FIELDS`, so a switch is never broadcast to another
 * tab and never on the undo stack. Files keep the legacy key `currentPersona` (first key of the case / of `common`) as the persona the file OPENS on:
 * it is written from the saving tab's persona and lifted out of the case when a file is opened (`liftPersona`). The case itself never holds it.
 */
export const PERSONA_KEY = 'currentPersona';
export const DEFAULT_PERSONA = 'builder';

type Bag = Record<string, unknown>;
/** The persona a case or common values carry (a legacy / saved file), or undefined. */
export const carriedPersona = (common: unknown): string | undefined => {
  const v = (common as Bag | undefined)?.[PERSONA_KEY];
  return typeof v === 'string' && v ? v : undefined;
};

/**
 * Move a carried `currentPersona` out of the common values. `adopt` (a document is opened): it becomes the tab's persona, else the tab's persona
 * (`fallback`) stays. Without `adopt` a stray key (an old snapshot activated, a patch from an older build) is simply dropped.
 */
export function liftPersona(pf: PortfolioDoc, adopt: boolean, fallback?: string): PortfolioDoc {
  const carried = carriedPersona(pf.common), has = PERSONA_KEY in (pf.common as unknown as Bag);
  const persona = adopt ? carried ?? pf.persona ?? fallback : pf.persona ?? fallback;
  if (!has && persona === pf.persona) return pf;
  const common = { ...(pf.common as unknown as Bag) };
  delete common[PERSONA_KEY];
  const out: PortfolioDoc = { ...pf, common: (has ? common : pf.common) as unknown as Portfolio['common'] };
  if (persona === undefined) delete out.persona; else out.persona = persona;
  return out;
}

/**
 * A portfolio replacing the current one (import, snapshot activation, another tab's document) keeps this tab's view state: its persona, its edit
 * scope and its display scope (a Wave or Unit view only while that wave or unit exists). The active product is the caller's choice (it is also saved).
 */
export function keepTabView(cur: PortfolioDoc, next: Portfolio): PortfolioDoc {
  const out: PortfolioDoc = { ...next }, shown = cur.displayScope;
  delete out.editScope; delete out.displayScope; delete out.persona;
  if (cur.editScope) out.editScope = cur.editScope;
  if (shown && scopeExists(next, shown)) out.displayScope = shown;
  if (cur.persona) out.persona = cur.persona;
  return out;
}

/** The common values as written to a file: the tab's persona first, as the legacy `currentPersona` (the file's opening persona). */
export const withSavedPersona = <T extends object>(caseOrCommon: T, persona: string | undefined): T =>
  (persona ? ({ [PERSONA_KEY]: persona, ...caseOrCommon } as T) : caseOrCommon);
