/** @calc-zone process-model */
import { END_ID, flowId, FORK_ID, JOIN_ID, START_ID } from './ids';
import { CROSS_ID, type CatLoopPair, type ProcessCatalogue } from './types';
import { el, type XElement } from './xml';

/** A sequence flow of the generated process. `inner`: the phase whose sub-process holds it (a rework between two activities of one phase). */
export interface FlowSpec { id: string; source: string; target: string; name?: string; inner?: string; rework?: CatLoopPair; order?: number }

/**
 * The control flow (spec § 3, F-B14): start → parallel fork → the phases in sequence → parallel join → end, with Cross-cutting in parallel
 * between the fork and the join; then one back flow per rework loop pair (`ac:rework`): between the two phases of an external rework, or
 * between the two activities when the pair sits in one phase.
 */
export function flowsOf(c: ProcessCatalogue, phaseOrder: string[]): FlowSpec[] {
  const chain = [START_ID, FORK_ID, ...phaseOrder, JOIN_ID, END_ID];
  const main: FlowSpec[] = chain.slice(1).map((to, i) => ({ id: flowId(chain[i] ?? '', to), source: chain[i] ?? '', target: to }));
  main.push({ id: flowId(FORK_ID, CROSS_ID), source: FORK_ID, target: CROSS_ID }, { id: flowId(CROSS_ID, JOIN_ID), source: CROSS_ID, target: JOIN_ID });
  const phaseOf = new Map([...c.sdlc, ...c.reg].map((a) => [a.id, a.phase]));
  const rework = c.loops.map((lp, i): FlowSpec => {
    const pa = phaseOf.get(lp.artA) ?? '', pb = phaseOf.get(lp.artB) ?? '', base = { id: lp.id, name: lp.label, rework: lp, order: i + 1 };
    if (lp.extFrom && lp.extTo) return { ...base, source: lp.extFrom, target: lp.extTo };
    return pa === pb ? { ...base, source: lp.artB, target: lp.artA, inner: pa } : { ...base, source: pb, target: pa };
  });
  return [...main, ...rework];
}

/** The BPMN element of a flow; a rework flow carries its loop parameters in `ac:rework`. */
export function flowElement(f: FlowSpec): XElement {
  const lp = f.rework;
  const ext = lp ? [el('bpmn:extensionElements', {}, [el('ac:rework', {
    order: f.order, probability: lp.extReworkPct, costShare: lp.extCostShare, internalIterations: lp.internalIter, note: lp.internalNote,
    activityA: lp.artA, activityB: lp.artB, external: lp.extFrom && lp.extTo ? 'true' : null,
  })])] : [];
  return el('bpmn:sequenceFlow', { id: f.id, name: f.name, sourceRef: f.source, targetRef: f.target }, ext);
}
