/** @calc-zone foundation */
import type { Artefact, EvtClassSeed, LoopPair, Location, Phase, StatusLifecycleDef } from '../types/catalog';
import type { Coef, EngageCoefRow, ModelState, TeamRow, TokenModel } from '../types/state';
import locations from './locations.json';
import engageCoef from './engageCoef.json';
import evtClassSeed from './evtClassSeed.json';
import evtClassOrder from './evtClassOrder.json';
import qualAnchor from './qualAnchor.json';
import statusLifecycle from './statusLifecycle.json';
import tokenModels from './tokenModels.json';
import coef from './coef.json';
import scalars from './scalars.json';
import modelDefaults from './modelDefaults.json';
import maturityMap from './maturityMap.json';
import rate from './rate.json';
import teamIn from './teamIn.json';
import shippedProcess from './defaultProcess.bpmn?raw';
import { viewsOf } from '../process/views';
import { readXml } from '../process/xmlRead';

/**
 * SPEC_FIXES FX-02 (decision D-B9 (b)): the shipped default process `defaultProcess.bpmn` is the ONE source of the catalogue — the phases, the
 * activities, the regulatory catalogue and its norms, the rework pairs are read from it (DOM-free, `readXml`; the views of the process,
 * `viewsOf`). The JSON catalogues that generated it are retired; `npm run process:check` regenerates the file from these lists byte-identically.
 */
const SHIPPED = viewsOf(readXml(shippedProcess));

/** Code-owned catalogues (extracted from the legacy app by tools/extract-catalog.mjs). */
export const SDLC_ARTEFACTS = SHIPPED.sdlc as unknown as Artefact[];
export const REG_ARTEFACTS = SHIPPED.reg as unknown as Artefact[];
export const REG_NORMS = SHIPPED.norms as unknown as { industry: string; name: string; count: number }[];
export const PHASES = SHIPPED.phases as unknown as Phase[];
export const LOCATIONS = locations as Location[];
export const ENGAGE_COEF = engageCoef as Record<string, EngageCoefRow>;
export const LOOP_PAIRS = SHIPPED.loopPairs as unknown as LoopPair[];
export const EVT_CLASS_SEED = evtClassSeed as Record<string, EvtClassSeed>;
export const EVT_CLASS_ORDER = evtClassOrder as string[];
export const QUAL_ANCHOR = qualAnchor as Record<string, { m: number; l: string }>;
export const STATUS_LIFECYCLE = statusLifecycle as StatusLifecycleDef[];
export const TOKEN_MODELS_DEFAULT = tokenModels as TokenModel[];
export const COEF_DEFAULT = coef as Coef;
export const KT_RED = scalars.ktRed;
export const CC_MULT = scalars.ccMult;
export const SUP_REF_HOURS_PER_PERIOD = scalars.supRefHours;
export const MODEL_DEFAULTS = modelDefaults as unknown as ModelState;
export const MATURITY_DEFAULT = maturityMap as { rampBounds: number[] };
export const RATE_DEFAULT = rate as Record<string, Record<string, number>>;
export const TEAM_DEFAULT = teamIn as TeamRow[];
export const ALL_PHASE_IDS = PHASES.map((p) => p.id);
