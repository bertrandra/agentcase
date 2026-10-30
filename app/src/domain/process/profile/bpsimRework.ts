/** @calc-zone process-model */
import type { Sim } from '../readPhases';
import type { BoundaryRework } from '../readRework';
import type { FlowView } from '../readTypes';
import { attr, kid, kids, NS, type XElement } from '../xml';

/**
 * BPSim as an input for rework paths (spec F-B47, D-B5; phase B5b): an error boundary event without `ac:rework` whose leaving flow has a BPSim
 * probability is a rework loop of that probability (cost share 0: BPSim has no equivalent, the loop adds no rework effort until one is set).
 */
/** The error boundary events of a container that carry no `ac:rework` but whose leaving flow has a BPSim probability. */
export function bpsimReworksIn(container: XElement, flows: FlowView[], sim: Sim): Omit<BoundaryRework, 'target'>[] {
  return kids(container, NS.bpmn, 'boundaryEvent').flatMap((e) => {
    const id = attr(e, 'id') ?? '', x = kid(e, NS.bpmn, 'extensionElements');
    if (!kid(e, NS.bpmn, 'errorEventDefinition') || (x && kid(x, NS.ac, 'rework'))) return [];
    const f = flows.find((fl) => fl.source === id && !fl.rework), p = f ? sim.get(f.id)?.probability : undefined;
    if (p === undefined) return [];
    const r: Omit<BoundaryRework, 'target'> = { id, attachedTo: attr(e, 'attachedToRef') ?? '', probability: p, costShare: 0, internalIterations: 0 };
    const name = attr(e, 'name');
    if (name !== undefined) r.name = name;
    return [r];
  });
}
