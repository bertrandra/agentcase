/** @calc-zone process-model */
/**
 * The optional CMMN 1.1 view of the run phase (docs/SPEC_BPMN.md F-B63, decision D-B25; phase B7b): export (`export.ts`) and the read-back of
 * what maps to the process model (`read.ts`: tasks, roles, frequencies).
 */
export { cmmnDocument, CMMN_NS, RUN_PHASE } from './export';
export { applyCmmn, isCmmn, readCmmn, type CmmnStage, type CmmnTask, type CmmnView } from './read';
