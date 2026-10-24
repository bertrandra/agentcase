import { economicsView, type EconomicsView } from '@/domain/economics';
import { equalIgnoring } from '@/store/equal';
import { useCtxSelector } from '@/store/hooks';

/** The figures decide: `eng` (the Time Engine the view was computed with) differs per document, and no money section reads it. */
const sameFigures = equalIgnoring<EconomicsView>('eng');

/**
 * The money views of the current case (Time Engine + model). A selector: an edit that leaves every figure of the view unchanged (a name, a note, a
 * persona list) does not re-render the money sections nor rebuild their charts.
 */
export function useEconomics(): EconomicsView {
  return useCtxSelector(economicsView, sameFigures);
}
