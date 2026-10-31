import type { Deviation } from './deviations';

/**
 * BPMN B9b (docs/SPEC_BPMN.md § 19.6 D-B27…D-B31, § 19.3 F-B68; docs/DEVIATIONS.md the B9b deviations): the transformation programme's figures move ON
 * PURPOSE. The legacy oracle fields each family moves (a field moved by several families is listed under each; the first match reports it). The new
 * rules are asserted by tests/domain/programme/{profile,timing-owner,legacy-profile}.test.ts (hand-computed, and the skipped fields equal to the
 * oracle when the legacy profile is injected) and the cross-surface tests.
 */
/** Fields of the ROI's setup (its amount): the setup total and everything that subtracts or divides by it. */
const SETUP_AMOUNT = ['model.setupTotal', 'model.conv.setupBase', 'model.conv.setupBillable', 'model.conv.setupAbsorbed',
  'mcRun.outcomes', 'mcRun.stats.mean', 'mcRun.stats.cvar10', 'mcRun.stats.pNeg',
  'decisionRun.setup', 'decisionRun.p10Floor', 'decisionRun.stats.mean', 'decisionRun.stats.cvar10', 'decisionRun.stats.pNeg', 'decisionRun.confidence',
  'decisionRun.verdict', 'strategyEval[].computed.tco', 'strategyEval[].computed.net', 'strategyEval[].computed.setup', 'strategyEval[].computed.roi',
  'strategyEval[].computed.payback', 'strategyRanking', 'resultsCore.setup', 'resultsCore.net', 'resultsCore.roi', 'resultsCore.payback',
  'thinNow.totalSavings', 'thinNow.npv', 'thinNow.payback', 'thinNow.inputHash', 'compareView.cost[2]', 'compareView.table[5]', 'sensitivityView.table[4]',
  'me_mcs.stats.npv', 'me_mcs.stats.paybackMonths', 'payback', 'npv', 'econ_monthly[].setupSpend', 'econ_monthly[].total', 'econ_monthly[].cum',
  'econ_roi.net', 'econ_roi.roi', 'econ_roi.roiPct', 'econ_roi.npv', 'econ_roi.payback', 'econ_roi.paybackText'];
/** Fields of the setup's timing: when it is spent (the monthly cash flow, the payback, the NPV). */
const SETUP_TIMING = ['payback', 'npv', 'econ_monthly[].setupSpend', 'econ_monthly[].total', 'econ_monthly[].cum', 'thinNow.npv', 'thinNow.payback',
  'thinNow.inputHash', 'resultsCore.payback', 'strategyEval[].computed.payback', 'strategyRanking', 'compareView.table[5]', 'me_mcs.stats.npv',
  'me_mcs.stats.paybackMonths', 'econ_roi.npv', 'econ_roi.payback', 'econ_roi.paybackText'];

export const B9B_DEVIATIONS: Deviation[] = [
  { id: 'DEV-B9B-COACHING',
    reason: 'D-B30: one coaching activity, priced along its curve (entry team × coaching load Y1 → cruise × day rate × working days, over the ' +
    'horizon) and in the euro result (the setup); the setupCoaching amount is no longer read. golden: coaching €35,000 → €1,241,460.', skip: SETUP_AMOUNT },
  { id: 'DEV-B9B-RESOURCES',
    reason: 'F-B68 / § 19.3: training and governance are labour from resources (trainers 0.5 FTE, Design Authority 0.25 FTE, over the setup duration, ' +
    'at the target day rate × the AI-skill premium); the setupTraining / setupGov amounts are no longer read. golden: €45,000 → €52,877, €20,000 → ' +
    '€26,438.5.', skip: SETUP_AMOUNT },
  { id: 'DEV-B9B-SETUP-SPREAD',
    reason: 'D-B27: each setup line is spent over its activity\'s duration (the setup duration, 12 months by default) instead of the engine\'s fixed ' +
    '6 months; the waves\' capacity and setupEnd dependencies count the setup duration.', skip: SETUP_TIMING },
  { id: 'DEV-B9B-HUB-TIMING',
    reason: 'D-B29: the Knowledge Hub setup is spent over its own days (khSetupDays, 30 → month 1 in a single case), placed ktLeadMonths before the ' +
    'product\'s month 0 in a portfolio, instead of inside the 6-month setup profile.', skip: SETUP_TIMING },
  { id: 'DEV-B9B-PILOT',
    reason: 'D-B28: the pilot is the Pilot & Prove stage before the build: the stage lasts the pilot (prove weeks + 2 × break-in, 16 weeks) instead ' +
    'of rmD4 (6), the runway and decision dates follow; the cost model spends the pilot in the months before the product\'s month 0.', skip: [] },
];
