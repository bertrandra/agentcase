import { serialize, type XDocument } from '@/domain/process';
import { createAppStore, type AppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { HIGH_WATER_KEYS } from '@/store/portfolioState';

/** A fresh store on the default case, installed as the application store (controllers dispatch to it). */
export function freshStore(now: () => number = () => 0): AppStore {
  const s = createAppStore(makeDefaultDoc(), { now });
  setAppStore(s);
  return s;
}
/**
 * The default case as the legacy file had it, for the tests that compare a fresh case with the legacy oracle: without the hub-curation coefficient
 * of a new case (DEV-NORM-KH-CURATION: a case without it prices the curation at the TJM, the legacy rule).
 */
export function legacyDefaultDoc(): ReturnType<typeof makeDefaultDoc> {
  const d = makeDefaultDoc(), coef = { ...(d.COEF as Record<string, unknown>) };
  delete coef.khCurationPremium;
  return { ...d, COEF: coef } as ReturnType<typeof makeDefaultDoc>;
}
/** A fresh store on the legacy default case (`legacyDefaultDoc`), installed as the application store. */
export function legacyFreshStore(now: () => number = () => 0): AppStore {
  const s = createAppStore(legacyDefaultDoc(), { now });
  setAppStore(s);
  return s;
}
/** JSON of a state with each process document as its XML text (the same content, schema v3; serialising it is memoised on the tree). */
export const json = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'document' ? serialize(x as XDocument) : x));
export const snap = (s: AppStore): string => json(s.getState().doc);
/** The whole portfolio (every product, wave, override and the view state): what a multi-product command changes. */
export const snapAll = (s: AppStore): string => json(s.getState().portfolio);
/** The same, high-water marks aside (`THEME_SEQ`): an undo restores everything else exactly, those counters never go back by design. */
export const snapUndoable = (s: AppStore): string => {
  const pf = s.getState().portfolio, common: Record<string, unknown> = { ...pf.common };
  HIGH_WATER_KEYS.forEach((k) => { delete common[k]; });
  return json({ ...pf, common });
};

/** A saved case file as far as the calculation package tests touch it. */
export interface Saved { dom: { values: Record<string, string> };
  calculationPackage: { calculationVersion: string; inputHash: string; headline: { npv: number }; annual: { savings: number }[] } }
