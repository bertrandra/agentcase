/**
 * Machine-readable twin of docs/DEVIATIONS.md: the oracle fields where v19 intentionally differs from the legacy file.
 * Oracle tests drop exactly these fields (never a whole fixture) and assert the new rule in a dedicated test instead.
 * A `skip` entry is an oracle path with array indexes stripped: `mcRun.stats.p10` or `scenarioSet[].m.roi`; it covers its descendants.
 * `only` restricts the skip to the listed fixtures (the deviation changes those fields on them alone; every other fixture is still compared).
 */
export interface Deviation { id: string; reason: string; skip: string[]; only?: string[] }

export const DEVIATIONS: Deviation[] = [
  { id: 'DEV-MC-QUANTILE', reason: 'Decision Monte Carlo percentiles use numerics.quantile (linear interpolation) like the P4 layer; legacy took sorted[floor(f*n)].',
    skip: ['mcRun.stats.p10', 'mcRun.stats.p50', 'mcRun.stats.p90', 'decisionRun.stats.p10', 'decisionRun.stats.p50', 'decisionRun.stats.p90'] },
  { id: 'DEV-ROI-NOSETUP', reason: 'One ROI rule (roiCanonical): no setup gives null (n/a), not Infinity or 0.', skip: ['scenarioSet[].m.roi', 'thinNow.roi'] },
  { id: 'DEV-COMPARE-ENGINE', reason: 'Compare "Agentic" trajectory reads the Time Engine year rows (cash-flow includes KT/tax/rework; one value per horizon year).',
    skip: ['compareView.save[2]', 'compareView.table[3]'] },
  // Deviations that change no oracle field but are asserted by their own tests (see docs/DEVIATIONS.md).
  { id: 'DEV-HEADLINE-OWNER', reason: 'One headline (net, ROI, payback year, NPV) from the Time Engine rows; no figure changes.', skip: [] },
  { id: 'DEV-HORIZON-SUMS', reason: 'Sums run over the horizon\'s years, not the three-entry yearSav (chain ROI row, sensitivity, hub delta); compared to the oracle at horizon 3 only.', skip: [] },
  { id: 'DEV-PNEG-NAMES', reason: 'pNeg is pNetNeg (decision MC) or pSavNeg (P4 MC); mapped back by legacyNames().', skip: [] },
  { id: 'DEV-ANCHOR-CLAMP', reason: 'Velocity and lead time go through the case anchors and stay in [as-is, target]; recomputed from the oracle realisation.', skip: [] },
  { id: 'DEV-SCENARIO-ENGINE', reason: 'The six scenarios run the Time Engine of the case (monthly adoption, engine setup spread and overlays) with their levers, not the flat annual model; dayRateByYear is gone. Asserted in scenarioReconcile.test.ts.',
    skip: ['scenarioSet[].m.setup', 'scenarioSet[].m.dayRateByYear', 'scenarioSet[].m.yearETP', 'scenarioSet[].m.yearAgentVfte', 'scenarioSet[].m.yearTeamCost',
      'scenarioSet[].m.yearToken', 'scenarioSet[].m.yearRun', 'scenarioSet[].m.yearSav', 'scenarioSet[].m.totBen', 'scenarioSet[].m.pbMonth'] },
  { id: 'DEV-NEG-MONEY', reason: 'A negative amount reads "−€1,234"; legacyMoney() maps the legacy forms.', skip: [] },
  { id: 'DEV-SENS-RERUN', reason: 'Each cell of the automation × glass-ceiling matrix reruns the Time Engine with the moved inputs (ROI can turn negative, no ' +
    'division by zero); the legacy scaled the base ROI. Asserted in stress.test.ts and stress-lot10.test.ts.', skip: ['sensitivityView.matrix'] },
  { id: 'DEV-PAYBACK-NOSETUP', reason: 'One displayed payback (displayedPayback): no setup and positive savings is "immediate" (0) on every screen and ranks best; ' +
    'the legacy said month 1 / Year 1 (Financial, Results), immediate (scenarios) and null ranked worst (strategies). Only econ-no-setup has no setup.',
    only: ['econ-no-setup'], skip: ['strategyEval[].computed.payback', 'strategyRanking[].norm.payback', 'strategyRanking[].score', 'resultsCore.payback', 'resultsText'] },
  { id: 'DEV-YEAR-BEYOND-HORIZON', reason: 'Registry "Net savings Y2" / "Run cost, Y2" are n/a beyond the horizon; the legacy repeated year 1 (model() arrays).',
    only: ['horizon-1', 'fm-generated-scope'], skip: [] },
  // No oracle field changes (asserted by their own tests): legacy-curve horizon sums, the last-recovery payback, the one split tolerance.
  { id: 'DEV-LEGACY-CURVE-HORIZON', reason: 'Under the legacy flat curves the Monte Carlo outcome, horizonYears and costReduction read the Time Engine over the ' +
    'whole horizon (the legacy summed the three-entry annual model); identical at horizon <= 3 (the curve-legacy fixture).', skip: [] },
  { id: 'DEV-PAYBACK-RECOVERY', reason: 'Payback = the month after the last negative cumulative month (null when the final cumulative is negative); identical on ' +
    'the 107 fixtures (single products never dip again).', skip: [] },
  { id: 'DEV-SPLIT-TOLERANCE', reason: 'One "adds up to 100 %" tolerance (0.5 point, domain/split.ts); the legacy target location mix used 1 point.', skip: [] },
  { id: 'DEV-ARCH-CONTENT', reason: 'The two architecture sections (arch-layers, arch-content) describe the TypeScript build; the legacy text is no longer their oracle (tests/ui/arch-facts.test.ts, tests/ui/sections/arch.test.tsx).', skip: [] },
];

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
export const legacyMoney = (t: string): string => t.replace(/\((€[\d.,]+[KkMm]?)\)/g, '−$1').replace(/€-(?=\d)/g, '−€').replace(/-€/g, '−€').replace(/−€0(?![\d.,])/g, '€0');   // "€-0K" (a rounded-away negative) prints without a sign
