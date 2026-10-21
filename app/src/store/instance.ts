import defaultDoc from './defaults/defaultDoc.json';
import { createAppStore, type AppStore } from './core';
import type { Doc } from './types';

/** The default case (legacy golden state). A fresh structured copy each time: documents are never shared between stores. */
export const makeDefaultDoc = (): Doc => structuredClone(defaultDoc) as unknown as Doc;

let current: AppStore | null = null;
/** The application store (lazy singleton). Controllers dispatch here; tests swap it with `setAppStore`. */
export function appStore(): AppStore { return (current ??= createAppStore(makeDefaultDoc())); }
export function setAppStore(s: AppStore | null): void { current = s; }
