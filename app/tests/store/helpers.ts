import { createAppStore, type AppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';

/** A fresh store on the default case, installed as the application store (controllers dispatch to it). */
export function freshStore(now: () => number = () => 0): AppStore {
  const s = createAppStore(makeDefaultDoc(), { now });
  setAppStore(s);
  return s;
}
export const snap = (s: AppStore): string => JSON.stringify(s.getState().doc);
/** The whole portfolio (every product, wave, override and the view state): what a multi-product command changes. */
export const snapAll = (s: AppStore): string => JSON.stringify(s.getState().portfolio);

/** A saved case file as far as the calculation package tests touch it. */
export interface Saved { dom: { values: Record<string, string> }; calculationPackage: { calculationVersion: string; inputHash: string; headline: { npv: number }; annual: { savings: number }[] } }
