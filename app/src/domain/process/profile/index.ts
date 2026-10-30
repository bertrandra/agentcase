/** @calc-zone process-model */
/**
 * The extended BPMN profile (docs/SPEC_BPMN.md § 17, phase B5b): readers, writers and the views, checks and figures each element feeds.
 * Traceability is `../trace.ts`, conditional scope `../conditions.ts` (with `domain/feel`), the foreign pass-through `../importKeep.ts`.
 */
export { activityFacts, typeOfTask, type ActFact } from './acts';
export { annotate, annotationsOf, notesByElement, withNotes, type Note } from './annotate';
export { ASSIGN_PARAMS, assignmentChecks, assignmentsOf, bindAssignment, declareParams, lanesOf, resourceParams, type Assignment,
  type LaneView } from './assign';
export { boundaryBpsim } from './bpsimBoundary';
export { addMessageFlow, addPool, conversationView, handoffsOf, interfacesOf, readCollab, setMultiplicity, type CollabView } from './collab';
export { colourBy, type ColourMode } from './colourBy';
export { DELIVERABLE_KINDS, kindOf, readData, type DataLink, type DataNode, type DataView, type DeliverableKind, type ToolUse } from './data';
export { agentBlocked, DATA_STATES, evidenceCount, gateStates, isKnowledgeHub, knowledgeHub, storeAccess, tokenProfile } from './dataChecks';
export { addDataRef, addDataStore, addImport, addItemType, linkInput, linkOutput, setDataState, setRequiresState, typeData } from './dataWrite';
export { BIOC_NS, COLOR_NS, coloursOf, diagramsOf, withColours, withPhaseDiagrams, type Colour } from './diagrams';
export { cycleOf, durationDays } from './duration';
export { effortFactors, type EffortFactor } from './effort';
export { cadenceOf, changeFailureRate, compensationOf, escalationsOf, serviceLevels, waitsOf } from './eventViews';
export { addBoundary, addCompensation, addDefinition, addEventSub, addInside, addWait, setCadence, type TriggerInput } from './eventWrite';
export { DEF_KINDS, readEvents, triggerOf, type BoundaryView, type EventsView } from './events';
export { addFlow, addGateway, FEEL_URI, setCondition, setDefaultFlow } from './gatewayWrite';
export { headerOf, TARGET_NAMESPACE, withHeader } from './header';
export { addCall, addGlobalTask, callsOf, libraryOf, withLibrary, type LibraryEntry } from './library';
export { clearLoop, PERIODS, readLoops, setBoundedLoop, setMultiInstance, type MultiInstance } from './loops';
export { indexOf } from './walk';
