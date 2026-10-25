import { FRAME_AGG } from './frame';
import { BASELINE_AGG } from './baseline';
import { SCOPE_AGG } from './scope';
import { TUNE_AGG } from './tune';
import { ECONOMICS_AGG } from './economics';
import { STRESS_AGG } from './stress';
import { VERDICT_AGG } from './verdict';
import { VERIFY_AGG } from './verify';
import { PRESENT_AGG } from './present';
import { DEFEND_AGG } from './defend';
import { CONFIGURE_AGG } from './configure';
import { FACTORY_AGG } from './factory';
import { REFSHARE_AGG } from './refshare';
import { MODEL_ENGINE_AGG } from './model-engine';
import { PORTFOLIO_AGG } from './portfolio';
import type { SectionMap } from '../types';

/**
 * Section id → lazy loader of its aggregate view component (Portfolio / Wave). A section without an entry gets the generic fallback of its kind
 * (`ui/zones/fallbacks.tsx`). One file per group, like the section loaders, so areas work in parallel without touching the same file.
 */
export const SECTION_AGGREGATES: SectionMap = { ...FRAME_AGG, ...BASELINE_AGG, ...SCOPE_AGG, ...TUNE_AGG, ...ECONOMICS_AGG, ...STRESS_AGG, ...VERDICT_AGG,
  ...VERIFY_AGG, ...PRESENT_AGG, ...DEFEND_AGG, ...CONFIGURE_AGG, ...FACTORY_AGG, ...REFSHARE_AGG, ...MODEL_ENGINE_AGG, ...PORTFOLIO_AGG };
