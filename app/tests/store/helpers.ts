import { createAppStore, type AppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';

/** A fresh store on the default case, installed as the application store (controllers dispatch to it). */
export function freshStore(now: () => number = () => 0): AppStore {
  const s = createAppStore(makeDefaultDoc(), { now });
  setAppStore(s);
  return s;
}
export const snap = (s: AppStore): string => JSON.stringify(s.getState().doc);
