/**
 * Machine-readable twin of docs/DEVIATIONS.md: the oracle fields where v19 intentionally differs from the legacy file.
 * Oracle tests drop exactly these fields (never a whole fixture) and assert the new rule in a dedicated test instead.
 * A `skip` entry is an oracle path with array indexes stripped: `mcRun.stats.p10` or `scenarioSet[].m.roi`; it covers its descendants.
 * `only` restricts the skip to the listed fixtures (the deviation changes those fields on them alone; every other fixture is still compared).
 */
export interface Deviation { id: string; reason: string; skip: string[]; only?: string[] }

export const DEVIATIONS: Deviation[] = [
  // BPMN B9a, owner's decision of 2026-10-30 (docs/SPEC_BPMN.md § 7.1 item 3): no oracle field changes; asserted by tests/store/reg-include-derived.test.ts.
  { id: 'DEV-REGINCLUDE-DERIVED',
    reason: 'The "Include regulatory artefacts" box is the process document\'s regInclude only: dom.checked.regInclude is dropped on open and ' +
    'never saved, the ' +
    'command writes the process only, the On/Off variable tgRegInclude and the legacy shape read the process. frame-industry-cross (box ticked, regInclude ' +
    'false) reads Off instead of On; no euro figure changes.', only: ['frame-industry-cross'], skip: [] },
  // BPMN B9a (docs/SPEC_BPMN.md § 19.7): screens only, no oracle field changes; asserted by tests/ui/programme-one-owner.test.ts and the section tests.
  { id: 'DEV-B9A-CONTEXT-SCREENS',
    reason: 'The fields and descriptions of the transformation programme activities (stage weeks, pilot, setup lines and duration, hub, KT ' +
    'preparation, run sizing, coaching load) are edited in the Process section\'s parameter panel only; the context screens keep their figures and ' +
    'link to the activities (Open in Process); the Gantt program bars are read-only.', skip: [] },
  { id: 'DEV-MC-QUANTILE',
    reason: 'Decision Monte Carlo percentiles use numerics.quantile (linear interpolation) like the P4 layer; legacy took sorted[floor(f*n)].',
    skip: ['mcRun.stats.p10', 'mcRun.stats.p50', 'mcRun.stats.p90', 'decisionRun.stats.p10', 'decisionRun.stats.p50', 'decisionRun.stats.p90'] },
  { id: 'DEV-ROI-NOSETUP', reason: 'One ROI rule (roiCanonical): no setup gives null (n/a), not Infinity or 0.', skip: ['scenarioSet[].m.roi', 'thinNow.roi'] },
  { id: 'DEV-COMPARE-ENGINE',
    reason: 'Compare "Agentic" trajectory reads the Time Engine year rows (cash-flow includes KT/tax/rework; one value per horizon year).',
    skip: ['compareView.save[2]', 'compareView.table[3]'] },
  // Deviations that change no oracle field but are asserted by their own tests (see docs/DEVIATIONS.md).
  { id: 'DEV-HEADLINE-OWNER', reason: 'One headline (net, ROI, payback year, NPV) from the Time Engine rows; no figure changes.', skip: [] },
  { id: 'DEV-HORIZON-SUMS',
    reason:
    'Sums run over the horizon\'s years, not the three-entry yearSav (chain ROI row, sensitivity, hub delta); compared to the oracle at horizon 3 only.',
    skip: [] },
  { id: 'DEV-PNEG-NAMES', reason: 'pNeg is pNetNeg (decision MC) or pSavNeg (P4 MC); mapped back by legacyNames().', skip: [] },
  { id: 'DEV-ANCHOR-CLAMP', reason: 'Velocity and lead time go through the case anchors and stay in [as-is, target]; recomputed from the oracle realisation.',
    skip: [] },
  { id: 'DEV-SCENARIO-ENGINE',
    reason:
    'The six scenarios run the Time Engine of the case (monthly adoption, engine setup spread and overlays) with their levers, not the flat annual model; ' +
      'dayRateByYear is gone. Asserted in scenarioReconcile.test.ts.',
    skip: ['scenarioSet[].m.setup', 'scenarioSet[].m.dayRateByYear', 'scenarioSet[].m.yearETP', 'scenarioSet[].m.yearAgentVfte', 'scenarioSet[].m.yearTeamCost',
      'scenarioSet[].m.yearToken', 'scenarioSet[].m.yearRun', 'scenarioSet[].m.yearSav', 'scenarioSet[].m.totBen', 'scenarioSet[].m.pbMonth'] },
  { id: 'DEV-NEG-MONEY', reason: 'A negative amount reads "−€1,234"; legacyMoney() maps the legacy forms.', skip: [] },
  { id: 'DEV-SENS-RERUN',
    reason: 'Each cell of the automation × glass-ceiling matrix reruns the Time Engine with the moved inputs (ROI can turn negative, no ' +
    'division by zero); the legacy scaled the base ROI. Asserted in stress.test.ts and stress-lot10.test.ts.', skip: ['sensitivityView.matrix'] },
  { id: 'DEV-PAYBACK-NOSETUP',
    reason: 'One displayed payback (displayedPayback): no setup and positive savings is "immediate" (0) on every screen and ranks best; ' +
    'the legacy said month 1 / Year 1 (Financial, Results), immediate (scenarios) and null ranked worst (strategies). Only econ-no-setup has no setup.',
    only: ['econ-no-setup'],
    skip: ['strategyEval[].computed.payback', 'strategyRanking[].norm.payback', 'strategyRanking[].score', 'resultsCore.payback', 'resultsText'] },
  { id: 'DEV-YEAR-BEYOND-HORIZON',
    reason: 'Registry "Net savings Y2" / "Run cost, Y2" are n/a beyond the horizon; the legacy repeated year 1 (model() arrays).',
    only: ['horizon-1', 'fm-generated-scope'], skip: [] },
  // No oracle field changes (asserted by their own tests): legacy-curve horizon sums, the last-recovery payback, the one split tolerance.
  { id: 'DEV-LEGACY-CURVE-HORIZON',
    reason: 'Under the legacy flat curves the Monte Carlo outcome, horizonYears and costReduction read the Time Engine over the ' +
    'whole horizon (the legacy summed the three-entry annual model); identical at horizon <= 3 (the curve-legacy fixture).', skip: [] },
  { id: 'DEV-PAYBACK-RECOVERY',
    reason: 'Payback = the month after the last negative cumulative month (null when the final cumulative is negative); identical on ' +
    'the 107 fixtures (single products never dip again).', skip: [] },
  { id: 'DEV-SPLIT-TOLERANCE', reason: 'One "adds up to 100 %" tolerance (0.5 point, domain/split.ts); the legacy target location mix used 1 point.',
    skip: [] },
  // Lot 10, one source of truth (docs/DEVIATIONS.md; asserted in tests/domain/lot10-sot.test.ts and tests/domain/sot-cross-surface.test.ts).
  { id: 'DEV-FTE-ONE-DEF',
    reason: 'One human-FTE definition (fteBeforeAfter: delivery team + agentic run team, freed = max(0, before - after)) on every screen; the ' +
    'legacy freed FTE / residual human FTE used the delivery team only (Financial, Results), a flat base × ramp × eff (Results, fte-vfte table) or base × ' +
    'adoption (engage tracker).', skip: ['econ_roi.freed', 'resultsCore.tot.human', 'resultsCore.tot.agent', 'frameQuarters[].freed', 'kpiChart[0]'] },
  { id: 'DEV-TEAM-RUN-END',
    reason: 'The target team adds the agentic run team of the horizon end year (the legacy read year 3 whatever the horizon); identical at ' +
    'horizon <= 3.', only: ['combo-stress', 'fm-generated-tuned', 'me-flow', 'sc-horizon-5'],
    skip: ['vfa_target.runETP', 'vfa_target.totalRecurrent', 'scurveMath.team.runETP', 'pdc_verif.checks[5]', 'pdc_vars.totalTargetFteY3'] },
  { id: 'DEV-SETUP-BREAKDOWN', reason: 'One setup breakdown whose total is model().setupTotal: the Agentic Setup total, the Investment table and the Excel ' +
    'Investment sheet list the HRI change cost and the hub setup; the legacy Setup screen totalled the four input lines only.', skip: [] },
  { id: 'DEV-RESULTS-ENGINE-SAVINGS',
    reason: 'Results "total savings / yr" is the Time-Engine end-year savings (the decomposition lines plus a reconciling line); ' +
    'the legacy printed the decomposition subtotal. No oracle field (resultsCore.B is still the decomposition).', skip: [] },
  { id: 'DEV-VTAX-CAP',
    reason: 'The verification-tax explanation applies COEF.vtaxCap (the cap the model applies) instead of a hard-coded 0.6, and prints the € ' +
    'at the horizon end year and the tax of every horizon year.', skip: [] },
  { id: 'DEV-MATURITY-BOUNDS',
    reason: 'The S-curve readout, bands, gridlines and the legends follow the editable maturity bounds (rampBoundsOf); the legacy readout ' +
    'used fixed 25 / 55 / 80.', skip: [] },
  { id: 'DEV-GLASS-CEILING-OWNER',
    reason: 'The registry glass ceiling, max automatable % and the decision context read model().ceiling (the computed ceiling) ' +
    'instead of the raw glassCeiling input; identical on the 107 fixtures (none has a computed ceiling that differs from its input).', skip: [] },
  { id: 'DEV-AUDIT-EVIDENCE',
    reason: 'Audited observations count as evidence in the evidence ledger (D-B33); no legacy case holds audit data, so no oracle field changes ' +
    '(asserted per fixture in tests/domain/audit/evidence.test.ts).', skip: [] },
  { id: 'DEV-CM-CONFIDENCE',
    reason: 'The commercial recommendation (screen and registry) reads the confidence of the last Monte Carlo run, like the legacy screen; ' +
    'the legacy registry evaluated it before its own run, so its oracle value is the no-run recommendation (pdc-vars.test.ts compares that order).', skip: [] },
  { id: 'DEV-ARCH-CONTENT',
    reason:
    'The two architecture sections (arch-layers, arch-content) describe the TypeScript build; the legacy text is no longer their oracle ' +
      '(tests/ui/arch-facts.test.ts, tests/ui/sections/arch.test.tsx).', skip: [] },
];

/** The fixtures a deviation restricted with `only` applies to. */
export const deviationFixtures = (id: string): string[] => DEVIATIONS.find((d) => d.id === id)?.only ?? [];

const strip = (p: string): string => p.replace(/\[\d+\]/g, '[]');

/**
 * The deviation (if any) that covers an oracle path of a mismatch line such as `mcRun.stats.p10: expected 1, got 2` (on `fixture`, for a deviation
 * restricted to some fixtures).
 */
export function deviationOf(line: string, fixture?: string): Deviation | undefined {
  const raw = line.slice(0, line.indexOf(':') < 0 ? line.length : line.indexOf(':'));
  const covers = (path: string, s: string) => path === s || path.startsWith(`${s}.`) || path.startsWith(`${s}[`);
  const applies = (d: Deviation) => !d.only || (fixture !== undefined && d.only.includes(fixture));
  return DEVIATIONS.find((d) => applies(d) && d.skip.some((s) => covers(raw, s) || covers(strip(raw), s)));
}

/** Mismatch lines minus the registered deviations (of `fixture`). */
export const withoutDeviations = (lines: string[], fixture?: string): string[] => lines.filter((l) => !deviationOf(l, fixture));

const RENAMED: Record<string, string> = { pNetNeg: 'pNeg', pSavNeg: 'pNeg' };
/** Our value with the v19 field names mapped back to the legacy ones (DEV-PNEG-NAMES: pure renames, the numbers are unchanged). */
export function legacyNames(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(legacyNames);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [RENAMED[k] ?? k, legacyNames(x)]));
  return v;
}

/**
 * DEV-ANCHOR-CLAMP: the legacy registry interpolated velocity / lead time without the clamp to [as-is, target] (and with fixed 35/59, 21/1); v19 uses
 * the case's anchor.
 */
export function anchored(asis: number, target: number, rel: number): number {
  const v = asis + (target - asis) * rel;
  return target >= asis ? Math.min(v, target) : Math.max(v, target);
}

/** DEV-ANCHOR-CLAMP on the story table: the legacy printed the unclamped velocity ("+94%" = 68 SP); v19 clamps it to the 59 SP elite target. */
export const legacyVelocityRow = (row: string): string => {
  const legacySp = Math.round(35 * (1 + parseFloat(row) / 100));
  return `+${Math.round((Math.min(legacySp, 59) - 35) / 35 * 100)}%`;
};

/** DEV-NEG-MONEY: legacy negative amounts ("€-15K", "-€15K", "(€15,379)") in the one v19 convention "−€15K" (U+2212 before the euro sign). */
/** A legacy oracle value (any JSON) with every negative amount read in the v19 convention. */
export const legacyJson = <T>(v: T): T => JSON.parse(legacyMoney(JSON.stringify(v))) as T;
export const legacyMoney =
  (t: string): string => t.replace(/\((€[\d.,]+[KkMm]?)\)/g, '−$1').replace(/€-(?=\d)/g, '−€').replace(/-€/g, '−€')
  .replace(/−€0(?![\d.,])/g, '€0');   // "€-0K" (a rounded-away negative) prints without a sign
