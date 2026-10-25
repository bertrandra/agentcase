import { FRAME } from './frame';
import { BASELINE } from './baseline';
import { SCOPE } from './scope';
import { TUNE } from './tune';
import { ECONOMICS } from './economics';
import { STRESS } from './stress';
import { VERDICT } from './verdict';
import { VERIFY } from './verify';
import { PRESENT } from './present';
import { DEFEND } from './defend';
import { CONFIGURE } from './configure';
import { FACTORY } from './factory';
import { REFSHARE } from './refshare';
import { MODEL_ENGINE } from './model-engine';
import { PORTFOLIO } from './portfolio';
import type { SectionMap } from './types';

/** Section id → lazy component. Sections not listed render the placeholder. Each group file is edited by one area only. */
export const SECTION_COMPONENTS: SectionMap = { ...FRAME, ...BASELINE, ...SCOPE, ...TUNE, ...ECONOMICS, ...STRESS, ...VERDICT, ...VERIFY, ...PRESENT,
  ...DEFEND, ...CONFIGURE, ...FACTORY, ...REFSHARE, ...MODEL_ENGINE, ...PORTFOLIO };
