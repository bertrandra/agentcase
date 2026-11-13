import { beforeEach } from 'vitest';

/** The diagrams' saved display options (`useDiagramView`, kept in localStorage) start from the defaults in every test. */
beforeEach(() => {
  if (typeof window === 'undefined') return;
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith('ac-diagram-view:')) window.localStorage.removeItem(k);
  } catch { /* no storage */ }
});
