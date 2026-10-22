/** @calc-zone aggregate-views */
import { aggregateResults, aggregateStrategies, type ResultsAgg, type StrategyAgg } from '@/domain/portfolio';
import { useAggregate } from './selectionHooksEconomics';

/** Section Results: the consolidated outcome of the View (key figures, savings decomposition, team shift). */
export const useResultsAggregate = (): ResultsAgg | null => useAggregate(aggregateResults);
/** Section Strategy comparison: the recommended delivery strategy of each product of the View and the roll-up. */
export const useStrategiesAggregate = (): StrategyAgg | null => useAggregate(aggregateStrategies);
