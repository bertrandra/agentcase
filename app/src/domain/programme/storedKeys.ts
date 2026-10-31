/** @calc-zone foundation */
/**
 * The programme's stored values (docs/SPEC_BPMN.md § 19.5 B9c, § 6.1 schema v4; D-B1 / D-B26): the case keys that held the transformation
 * programme's values until schema v3 and live in the case's BPMN document since schema v4 (`ac:programmeValues` of the delivery process,
 * `domain/process/storedValues.ts`). Each is a parameter of a programme activity (`catalogue.ts`, `optIn.ts`: a test checks this list against
 * them), the cost profile type of a cost line (`costProfile_<line>`), an activity's own description (`activityDesc_<kind>`) or WBS code override
 * (`wbsCode-<kind>`). The order is the catalogue's: the order a migrated document lists them in.
 * `setupTraining` / `setupGov` are the legacy amounts of the training and governance lines (priced from resources since B9b): read only by the
 * legacy outputs (assumption register, due-diligence pack, Parameters sheet) and the strategies' scaling, so stored here, not retired
 * (docs/SPEC_BPMN.md § 19.13).
 */
export const PROGRAMME_VALUE_KEYS: readonly string[] = [
  'rmD1', 'rmD2', 'rmD3', 'optStages', 'stagesFte', 'decideDays',
  'pilotFte', 'pilotBreakin', 'pilotWeeks', 'setupTooling', 'setupTraining', 'setupGov',
  'trainFte', 'trainMonths', 'capOps', 'capTrain', 'capTarget',
  'coachDaysPerMonth', 'coachMonths', 'setupCoaching', 'coachY1', 'coachCruise', 'govFte', 'govMonths',
  'khTargetCC', 'khSetupBase', 'khSetupDays', 'setupDuration', 'runSizeMode', 'runFloorMin', 'runFloorPct', 'runOpsPerAgent', 'khCurationFTE',
  'khInfraMonthly',
  'optProcure', 'procureDays', 'optIntegr', 'integrations', 'integrDays', 'optHypercare', 'hypercareFte', 'hypercareWeeks', 'optDecom', 'decomDays',
  'decomSaving', 'optValue', 'valueFte', 'optAiAct', 'aiActDays', 'optAudit', 'auditDays',
];
/** The key families of per-line and per-activity values (B9d, B9e). */
export const PROGRAMME_KEY_PREFIXES: readonly string[] = ['costProfile_', 'activityDesc_', 'wbsCode-'];
const KEYS = new Set(PROGRAMME_VALUE_KEYS);
/** A key whose value the case's document holds (never a form value of a stored case since schema v4). */
export const isProgrammeKey = (id: string): boolean => KEYS.has(id) || PROGRAMME_KEY_PREFIXES.some((p) => id.startsWith(p) && id.length > p.length);

/** The canonical position of a key in the stored list: the catalogue order, then the per-line / per-activity keys by name. */
export function programmeKeyOrder(keys: Iterable<string>): string[] {
  const rank = (k: string): number => { const i = PROGRAMME_VALUE_KEYS.indexOf(k); return i < 0 ? PROGRAMME_VALUE_KEYS.length : i; };
  return [...keys].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
}
