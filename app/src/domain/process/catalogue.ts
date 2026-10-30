/** @calc-zone process-model */
import { LOOP_PAIRS, PHASES, REG_ARTEFACTS, REG_NORMS, SDLC_ARTEFACTS } from '../catalog';
import { SKILL_MAP_DEFAULT, SKILLS_EXIST } from '../catalog/skills';
import type { Phase } from '../types/catalog';
import { CROSS_ID, type CatArtefact, type CatLoopPair, type CatPhase, type Norm, type ProcessCatalogue } from './types';

/** The Cross-cutting bucket as a phase (same value as scopeView's CROSS_CUTTING; a test keeps the two equal until B3 makes this the source). */
export const CROSS_PHASE: Phase = { id: CROSS_ID, name: 'Cross-cutting (regulatory & AI framing)', sdlc: 0, reg: 0, role: '', seq: 99 };

/** Today's catalogues as the input of the default process (spec § 3, § 6.3). */
export const TODAYS_CATALOGUE: ProcessCatalogue = {
  phases: PHASES as CatPhase[], crossCutting: CROSS_PHASE, sdlc: SDLC_ARTEFACTS as CatArtefact[], reg: REG_ARTEFACTS as CatArtefact[],
  norms: REG_NORMS as Norm[], loops: LOOP_PAIRS as CatLoopPair[], skillMap: SKILL_MAP_DEFAULT, laneOrder: SKILLS_EXIST,
};
