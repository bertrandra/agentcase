export { STRATEGY_DEFS_DEFAULT, STRAT_WEIGHTS_DEFAULT, stratAppliedOf, strategyDefsOf, stratWeightsOf, type LeverKey, type Levers, type LocSplit, type StratApplied, type StrategyDef, type Weights } from './defs';
export { SCALED_IDS, evaluateStrategies, scopedHumanSup, stratBaseValues, stratTargetLoc, type StrategyRow } from './evaluate';
export { METRICS, metricExtremes, metricValue, stratNormalize, strategyLocSplits, type LocSplitRow, type MetricKey, type Ranked } from './rank';
export { strategyPatch, type ApplyPatch } from './apply';
export { decide, DI_THRESHOLDS, VERDICT_META, type Decision, type Verdict } from './decision';
export { decisionContext, eligibilityNote, lifecycleStatusLabel, readinessIndex, type CtxLine } from './context';
export { savingsBreakdown, resultsCore, teamShift, type ResultsCore, type SavingsYear, type TeamShift } from './results';
export { AIACT_TIERS, wave2RiskPremium } from './risk';
