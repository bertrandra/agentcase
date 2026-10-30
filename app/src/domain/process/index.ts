/** @calc-zone process-model */
/** The delivery process as a native BPMN 2.0 document (docs/SPEC_BPMN.md): node tree, default process, typed reads and derived views. */
export * from './xml';
export { serialize, serializeElement, indent } from './xmlWrite';
export { buildProcess, CASE_SCHEMA } from './buildProcess';
export { TODAYS_CATALOGUE, CROSS_PHASE } from './catalogue';
export { catalogueProcess } from './defaultProcess';
export { readProcess } from './read';
export type { ActivityView, ActorView, DiagramView, FlowView, NormView, PhaseView, ProcessView } from './read';
export { processFromCase, scopeKeysOf } from './fromCase';
export { viewsOf, type ProcessViews } from './views';
export type { CatalogueViews } from './viewsCatalogue';
export type { ScopeKeys, ProcessCatalogue, CatArtefact, CatLoopPair, CatPhase, Norm } from './types';
export { exportDocument, exportCaseText, isPartial, type ExportOptions } from './exportCase';
export { collaborationDocument, collaborationText, prefixIds, type ProductInput } from './exportPortfolio';
export { BPSIM_NS, readBpsim, type BpsimValues } from './bpsim';
export { securityCheck, LIMITS, ID_PATTERN, RESERVED_IDS, type Finding, type Limits, type SecurityReport } from './security';
