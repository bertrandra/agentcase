/** @calc-zone run-setup-taxes */
/**
 * Ids of the transformation programme's elements (docs/SPEC_BPMN.md § 19; phase B9a). They start with `prog-`, which no delivery element uses
 * (the delivery ids are artefact codes, `phase-…`, `lane-…`, `role-…`), so both processes share one selection and one BPMN document.
 */
export const PROGRAMME_PREFIX = 'prog-';
export const PROGRAMME_PROCESS_ID = 'prog-Process';
export const PROGRAMME_PARTICIPANT_ID = 'prog-Participant';
export const DELIVERY_PARTICIPANT_ID = 'Participant';

/** The id of a programme activity (`prog-pilot`, `prog-stage-discover`…). */
export const programmeActivityId = (kind: string, sub?: string): string => `${PROGRAMME_PREFIX}${kind}${sub ? `-${sub}` : ''}`;
export const isProgrammeId = (id: string | null | undefined): boolean => !!id && id.startsWith(PROGRAMME_PREFIX);
export const programmeLaneId = (role: string): string => `${PROGRAMME_PREFIX}lane-${role}`;
export const programmePhaseId = (phase: string): string => `${PROGRAMME_PREFIX}phase-${phase}`;
