/** @calc-zone delivery-views */
export { kpiView, fmtChg, type KpiCard } from './kpi';
export { execView, asisTobeView, productivityView, velocityView, qualityAnchorView } from './breakdowns';
export { complianceView, sectorCeiling } from './compliance';
export { ganttView, type GanttView, type PhaseRow, type ArtRow, type Span } from './gantt';
export { BAR_SPECS, resizeBar, moveStart, type Nudge } from './ganttEdit';
export { perfFrame, perfRel, refAvgAgent, perfCoef, type PerfFrame } from './perf';
export { QUALITY_DEFAULT, qualityRows, anchorClamp, type QualityRow } from './anchors';
