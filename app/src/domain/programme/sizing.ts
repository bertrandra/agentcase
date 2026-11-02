/** @calc-zone foundation */

/**
 * THE sizing table of the transformation programme (docs/PROGRAMME_SIZING_DMN.md, owner's decision 2026-11-02: "normalise"). Every cost line is
 * `A × Q × P × D` over a window W:
 * - A (activation): always · module · optIn · mode (two rules by a pricing / sizing mode) · once (case level: once per portfolio);
 * - Q (quantity): fte (FTE × duration) · rate (days per period × periods) · lump (days) · count (n × days each) · param (base × driver) ·
 *   amount (€) · engine (the engine's figure) · calib (days from an amount);
 * - P (price): role (target day rate × 1.15) · tjm (target day rate) · none (already €);
 * - W (window): stage · pre (ends at the product's month 0) · setup (from month 1) · after (after the setup) · golive · horizon;
 * - D (distribution, the default; each line can be typed in 🧩 Process): spread · oneOff · curve · recur · cont.
 * The DEFAULTS of every sizing input live here, once (normalisation #6): `profile.ts`, `optIn.ts`, `timing.ts`, `knowledge.ts`, `engagement.ts`
 * and the catalogue's labels read them. The table is also written as DMN decisions (`sizingDmn.ts`, exported next to the case's `.dmn`).
 */
export type ACode = 'always' | 'module' | 'optIn' | 'mode' | 'once';
export type QCode = 'fte' | 'rate' | 'lump' | 'count' | 'param' | 'amount' | 'engine' | 'calib';
export type PCode = 'role' | 'tjm' | 'none';
export type WCode = 'stage' | 'pre' | 'setup' | 'after' | 'golive' | 'horizon';
export type DCode = 'spread' | 'oneOff' | 'curve' | 'recur' | 'cont';
export interface SizingRule {
  line: string; label: string; level: 'case' | 'product'; a: ACode[]; q: QCode; p: PCode; w: WCode; d: DCode;
  /** the quantity's FEEL expression over its inputs (`workdays`: working days a year); a mode line (A = mode) has one per mode, keyed by the mode's
   *  value, the case key holding the mode in `modeKey` (DMN: one row per line and mode) */
  feel: string | Readonly<Record<string, string>>; modeKey?: string;
  /** the input keys the quantity reads, the window's duration key */
  inputs: string[]; duration?: string;
}

/** Every sizing default, by input key (the one place: normalisation #6). */
export const SIZING_DEFAULTS: Readonly<Record<string, number>> = Object.freeze({
  // windows
  setupDuration: 12, khSetupDays: 30, rmD1: 4, rmD2: 4, rmD3: 4, pilotWeeks: 12, pilotBreakin: 2,
  // core lines
  trainFte: 0.5, govFte: 0.25, coachDaysPerMonth: 2, pilotFte: 3, khSetupBase: 120000, khCurationFTE: 0.5, khInfraMonthly: 2500,
  // change management (days per entry FTE by readiness band: the band € of the legacy / the role rate of the rate card, see profile.ts)
  hriCostLight: 1200, hriCostStd: 3000, hriCostInt: 5500,
  // run team
  runFloorMin: 0.5, runFloorPct: 4, runOpsPerAgent: 0.15,
  // opt-in activities
  stagesFte: 2, decideDays: 5, valueFte: 0.1, aiActDays: 10, auditDays: 10, procureDays: 20, integrations: 5, integrDays: 5, hypercareFte: 1,
  hypercareWeeks: 6, decomDays: 10, decomSaving: 0,
});
export const sizingDefault = (key: string): number => SIZING_DEFAULTS[key] ?? 0;

const R = (line: string, label: string, level: SizingRule['level'], a: ACode[], q: QCode, p: PCode, w: WCode, d: DCode, feel: SizingRule['feel'],
  inputs: string[], duration?: string, modeKey?: string): SizingRule =>
  ({ line, label, level, a, q, p, w, d, feel, inputs, ...(duration ? { duration } : {}), ...(modeKey ? { modeKey } : {}) });
/** The (mode, formula) pairs of a rule: one with mode "-" (any) for a line without modes. */
export const feelsOf = (r: SizingRule): [string, string][] => (typeof r.feel === 'string' ? [['-', r.feel]] : Object.entries(r.feel));

/** The rules, in the order of the programme's cost lines. */
export const SIZING: readonly SizingRule[] = [
  R('tooling', 'Tooling & infra', 'product', ['always'], 'amount', 'none', 'setup', 'spread', 'setupTooling', ['setupTooling'], 'setupDuration'),
  R('training', 'Training', 'product', ['mode'], 'fte', 'role', 'setup', 'spread', { resources: 'trainFte * months * workdays / 12', amount: 'setupTraining' },
    ['trainPricing', 'trainFte', 'setupTraining'], 'trainMonths', 'trainPricing'),
  R('coaching', 'Coaching', 'product', ['mode'], 'rate', 'role', 'setup', 'spread',
    { resources: 'coachDaysPerMonth * coachMonths', amount: 'setupCoaching' }, ['coachPricing', 'coachDaysPerMonth', 'coachMonths', 'setupCoaching'],
    'coachMonths', 'coachPricing'),
  R('governance', 'Governance', 'product', ['mode'], 'fte', 'role', 'setup', 'spread', { resources: 'govFte * months * workdays / 12', amount: 'setupGov' },
    ['govPricing', 'govFte', 'setupGov'], 'govMonths', 'govPricing'),
  R('change', 'Change management (HRI)', 'product', ['module'], 'rate', 'role', 'setup', 'spread', 'entryFte * bandDays', ['hriCostLight', 'hriCostStd', 'hriCostInt'],
    'setupDuration'),
  R('knowledge', 'Knowledge hub setup', 'product', ['module'], 'param', 'none', 'pre', 'spread', 'khSetupBase * (0.5 + 0.25 * ccGap)', ['khSetupBase'], 'khSetupDays'),
  R('pilot', 'Pilot', 'product', ['always'], 'fte', 'role', 'pre', 'spread', 'pilotFte * weeks * workdays / 52', ['pilotFte'], 'pilotWeeks'),
  R('stages', 'Engagement stages', 'case', ['optIn', 'once'], 'fte', 'role', 'stage', 'spread', 'stagesFte * weeks * workdays / 52 + decideDays',
    ['stagesFte', 'decideDays'], 'rmD1'),
  R('valueTracking', 'Value tracking', 'case', ['optIn', 'once'], 'rate', 'role', 'horizon', 'spread', 'valueFte * workdays * years', ['valueFte']),
  R('aiAct', 'Risk mitigations and AI Act', 'case', ['optIn', 'once'], 'rate', 'role', 'horizon', 'spread', 'aiActDays * years', ['aiActDays']),
  R('audit', 'Audit and discovery interviews', 'case', ['optIn', 'once'], 'lump', 'role', 'pre', 'spread', 'auditDays', ['auditDays']),
  R('procurement', 'Licence procurement', 'case', ['optIn', 'once'], 'lump', 'role', 'pre', 'spread', 'procureDays', ['procureDays']),
  R('integration', 'Agent-toolchain integration', 'product', ['optIn'], 'count', 'role', 'setup', 'spread', 'integrations * integrDays',
    ['integrations', 'integrDays'], 'setupDuration'),
  R('hypercare', 'Rollout hypercare', 'product', ['optIn'], 'fte', 'role', 'golive', 'spread', 'hypercareFte * weeks * workdays / 52', ['hypercareFte'],
    'hypercareWeeks'),
  R('decommission', 'Legacy decommissioning', 'product', ['optIn'], 'lump', 'role', 'after', 'oneOff', 'decomDays', ['decomDays', 'decomSaving']),
  R('agentops', 'AgentOps run team', 'product', ['mode'], 'engine', 'role', 'horizon', 'cont',
    { hybrid: 'max(runFloorMin, baseFte * runFloorPct / 100) + agentVfte * runOpsPerAgent', legacy: 'legacyRunFte' },
    ['runSizeMode', 'runFloorMin', 'runFloorPct', 'runOpsPerAgent'], undefined, 'runSizeMode'),
  R('hubRun', 'Knowledge hub run', 'product', ['module'], 'fte', 'role', 'horizon', 'cont', 'khCurationFTE * workdays + khInfraMonthly * 12 / rate',
    ['khCurationFTE', 'khInfraMonthly']),
];
export const sizingRule = (line: string): SizingRule | undefined => SIZING.find((r) => r.line === line);

