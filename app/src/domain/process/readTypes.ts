/** @calc-zone process-model */
import type { BoundaryRework } from './readRework';
import { attr, kid, NS, type XElement } from './xml';

/** Typed, read-only views of a process document (spec § 6.1): computed from the node tree, never stored. */
export interface CaseMarks {
  /** `ac:inScope` (undefined when the document says nothing) */
  inScope?: boolean;
  /** position in the case's ordered list when it differs from document order (`ac:scopeRank`, `ac:offRank`) */
  rank?: number;
}
export interface PhaseView extends CaseMarks {
  id: string; name: string; adHoc: boolean; order?: number; seq: number; role: string; sdlc: number; reg: number; featureIds?: string[];
  /** the case's ramp-up sequence of this phase: absent = not listed, null = listed without a value (legacy `phaseSeq`) */
  rampSeq?: number | null; rampRank?: number;
}
export interface ActivityView extends CaseMarks {
  id: string; name: string; phase: string; element: string; type: string; regulatory: boolean; order: number;
  seq?: number; effort: number; weight?: number; value: string; capability?: string; aiAuthority: string; storyId: string | null;
  human: number; agent: number; agent0?: number; documentation?: string; deliverable?: string;
  norm?: string; performer?: string; humanPerformer?: string;
  /** legacy edit record of the case: which fields it holds, and its position when not in document order */
  edited?: string[]; editRank?: number;
}
export interface ActorView {
  id: string; name: string; kind: string; teamSkill?: string; regulatory: boolean; capability?: string;
  /** BPSim resource quantity, when a file carries one (no `ac:` equivalent) */
  quantity?: number;
}
export interface NormView extends CaseMarks { id: string; industry: string; name: string; count: number; body?: string; scope?: string }
export interface ReworkView {
  order: number; probability: number; costShare: number; internalIterations: number; note?: string; activityA: string; activityB: string; external: boolean;
}
export interface FlowView {
  id: string; name?: string; source: string; target: string; container: string; rework?: ReworkView;
  /** BPSim branching probability of a flow that carries no `ac:rework` (a foreign file) */
  probability?: number;
}
export interface ShapeView { id: string; element: string; x: number; y: number; w: number; h: number; expanded: boolean }
export interface EdgeView { id: string; element: string; points: [number, number][] }
export interface DiagramView { shapes: ShapeView[]; edges: EdgeView[] }
export interface Unmatched { list: string; rank: number; value: string }
export interface ProcessParams {
  caseSchema?: string; regInclude?: boolean; sdlcEdits?: string; regEdits?: string; rampSeq?: string; skillMap?: string;
  /** case list entries no element carries (unknown ids, repeats), with their position */
  unmatched: Unmatched[];
}
export interface ProcessView {
  params: ProcessParams; phases: PhaseView[]; activities: ActivityView[]; actors: ActorView[]; flows: FlowView[]; norms: NormView[];
  diagram: DiagramView;
  /** error boundary events carrying `ac:rework` (F-B47, D-B20), with the target of their outgoing flow */
  reworks: BoundaryRework[];
}

/** Small readers shared by the view builders. */
export const num = (v: string | undefined): number | undefined => (v === undefined || v === '' ? undefined : Number(v));
export const bool = (v: string | undefined): boolean | undefined => (v === undefined ? undefined : v === 'true');
export const ac = (e: XElement, name: string): string | undefined => attr(e, `ac:${name}`);
/** The `ac:<local>` element inside the element's `extensionElements`. */
export function extOf(e: XElement, local: string): XElement | undefined {
  const x = kid(e, NS.bpmn, 'extensionElements');
  return x ? kid(x, NS.ac, local) : undefined;
}
/** The case marks of an element: `ac:inScope` on it, its list position in its `ac:` extension element (`rankName`). */
export function marks(e: XElement, ext: XElement | undefined, rankName: string): CaseMarks {
  const out: CaseMarks = {}, s = bool(ac(e, 'inScope')), r = num(ext ? attr(ext, rankName) : undefined);
  if (s !== undefined) out.inScope = s;
  if (r !== undefined) out.rank = r;
  return out;
}
