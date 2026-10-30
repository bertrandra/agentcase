import defaultDoc from './defaults/defaultDoc.json';
import { createAppStore, type AppStore } from './core';
import { PERSONA_KEY } from './persona';
import { caseInStore } from './persistence/bpmn/caseDoc';
import type { Doc } from './types';

/**
 * The default case (legacy golden state). A fresh structured copy each time: documents are never shared between stores (the process document is
 * immutable, so the default one is shared). Without the legacy `currentPersona`: the persona is view state of the tab (`store/persona.ts`), never
 * a key of the case. Schema v3: the default case's scope keys are its process document (`BPMN`, the default process, spec § 6.3).
 */
export const makeDefaultDoc = (): Doc => {
  const d = structuredClone(defaultDoc) as Record<string, unknown>;
  delete d[PERSONA_KEY];
  return caseInStore(d) as unknown as Doc;
};

let current: AppStore | null = null;
/** The application store (lazy singleton). Controllers dispatch here; tests swap it with `setAppStore`. */
export function appStore(): AppStore { return (current ??= createAppStore(makeDefaultDoc())); }
export function setAppStore(s: AppStore | null): void { current = s; }
