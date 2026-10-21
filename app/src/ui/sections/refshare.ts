import type { SectionMap } from './types';

/** Migrated sections of the "refshare" group: section id → lazy loader of its component. */
export const REFSHARE: SectionMap = {
  sources: () => import('./refshare/sources'),
  io: () => import('./refshare/io'),
  sessions: () => import('./refshare/sessions'),
  'arch-layers': () => import('./refshare/arch-layers'),
  'arch-content': () => import('./refshare/arch-content'),
  deps: () => import('./refshare/deps'),
  datamodel: () => import('./refshare/datamodel'),
  calcengine: () => import('./refshare/calcengine'),
  reference: () => import('./refshare/reference'),
  glossary: () => import('./refshare/glossary'),
};
