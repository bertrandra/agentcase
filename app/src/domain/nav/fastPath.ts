import type { NavSection } from './layout';
import { flatten, type Stop } from './sequence';
import type { PersonaSeq } from '../pdc/personas';

/** Fast Path (legacy passesFastTrack): off keeps everything, on keeps the minimum-viable-path sections (`mvp`) plus Welcome. A pure view filter. */
export const passesFastPath = (s: Pick<NavSection, 'id' | 'mvp'> | undefined, on: boolean): boolean => !on || (!!s && (s.mvp === true || s.id === 'home'));

export const fastPathSections = (sections: NavSection[], on: boolean): NavSection[] => (on ? sections.filter((s) => passesFastPath(s, true)) : sections);

/** The walk under Fast Path (legacy wizFlatten): stops whose section is filtered out (or unknown) are dropped; a step left empty vanishes. */
export const flattenFast = (seq: PersonaSeq, sections: NavSection[], on: boolean): Stop[] =>
  on ? flatten(seq).filter((st) => passesFastPath(sections.find((s) => s.id === st.sec), true)) : flatten(seq);
