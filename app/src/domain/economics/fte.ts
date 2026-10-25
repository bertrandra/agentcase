/** @calc-zone delivery-views @owner fte-before-after */
/**
 * Total human FTE before (AS-IS entry team) and after (horizon end: delivery team plus the agentic run team) and the reduction, in percent of the
 * entry team.
 */
export interface FteBeforeAfter { before: number; after: number; reductionPct: number }

export const fteBeforeAfter = (before: number, after: number): FteBeforeAfter =>
  ({ before, after, reductionPct: before > 0 ? (1 - after / before) * 100 : 0 });
