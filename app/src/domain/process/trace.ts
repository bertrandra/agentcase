/** @calc-zone process-model */
import { activityFacts, type ActFact } from './profile/acts';
import { readData, type DataLink } from './profile/data';
import type { XElement } from './xml';

/**
 * The traceability graph of a process (spec F-B40, phase B5b): deliverables and repositories as nodes, activities as the edges that consume
 * them (`dataInputAssociation`) and produce them (`dataOutputAssociation`). Gives upstream / downstream of each deliverable and activity, the
 * impact of changing an activity (everything downstream of it), orphan deliverables (produced in scope, never consumed), missing inputs
 * (consumed in scope, produced by no in-scope activity; a data store is a source of its own, never missing) and, for the norms that require
 * traceability, a "traceability complete" check over their in-scope activities. Computed from the document, never stored.
 */
export const TRACE_NORMS: readonly string[] = ['DO-178C', 'DO-254', 'ISO 26262', 'IEC 62304', 'IEC 61508', 'EN 50128', 'EN 50716', 'ECSS'];

export interface NormTrace {
  norm: string; activities: number;
  /** in-scope activities of the norm without an input, without an output, or with an input no in-scope activity produces */
  noInput: string[]; noOutput: string[]; missingInput: string[];
  complete: boolean;
}
export interface TraceGraph {
  producers: ReadonlyMap<string, string[]>; consumers: ReadonlyMap<string, string[]>;
  /** activity → deliverables it reads / writes */
  inputs: ReadonlyMap<string, string[]>; outputs: ReadonlyMap<string, string[]>;
  orphans: string[]; missing: { activity: string; data: string }[];
  stores: ReadonlySet<string>;
}

const push = (m: Map<string, string[]>, k: string, v: string): void => {
  const l = m.get(k);
  if (!l) m.set(k, [v]); else if (!l.includes(v)) l.push(v);
};

const memo = new WeakMap<XElement, TraceGraph>();
/** The traceability graph of a document (in-scope activities only). */
export function traceGraph(defs: XElement): TraceGraph {
  const hit = memo.get(defs);
  if (hit) return hit;
  const facts = activityFacts(defs), data = readData(defs), on = (l: DataLink): boolean => facts.get(l.activity)?.inScope ?? false;
  const producers = new Map<string, string[]>(), consumers = new Map<string, string[]>(), inputs = new Map<string, string[]>();
  const outputs = new Map<string, string[]>(), stores = new Set(data.nodes.filter((n) => n.store).map((n) => n.id));
  for (const l of data.links.filter(on)) {
    if (l.dir === 'out') { push(producers, l.data, l.activity); push(outputs, l.activity, l.data); } else { push(consumers, l.data, l.activity); push(inputs,
      l.activity, l.data); }
  }
  const orphans = [...producers.keys()].filter((d) => !consumers.has(d) && !stores.has(d));
  const missing = [...inputs].flatMap(([activity, ds]) => ds.filter((d) => !producers.has(d) && !stores.has(d)).map((d) => ({ activity, data: d })));
  const out: TraceGraph = { producers, consumers, inputs, outputs, orphans, missing, stores };
  memo.set(defs, out);
  return out;
}

/** Activities reached by following the graph from `start` (`down`: what consumes its outputs; up: what produces its inputs), `start` excluded. */
function reach(g: TraceGraph, start: string, down: boolean): string[] {
  const seen = new Set<string>([start]), out: string[] = [], queue = [start];
  while (queue.length) {
    const a = queue.shift() as string;
    for (const d of (down ? g.outputs : g.inputs).get(a) ?? []) {
      for (const b of (down ? g.consumers : g.producers).get(d) ?? []) if (!seen.has(b)) { seen.add(b); out.push(b); queue.push(b); }
    }
  }
  return out;
}
/** The activities downstream of an activity: the impact of changing it. */
export const impactOf = (defs: XElement, activity: string): string[] => reach(traceGraph(defs), activity, true);
/** The activities upstream of an activity (what its inputs come from, transitively). */
export const upstreamOf = (defs: XElement, activity: string): string[] => reach(traceGraph(defs), activity, false);

/** Upstream (producers) and downstream (consumers) activities of a deliverable. */
export function deliverableTrace(defs: XElement, data: string): { upstream: string[]; downstream: string[] } {
  const g = traceGraph(defs);
  return { upstream: g.producers.get(data) ?? [], downstream: g.consumers.get(data) ?? [] };
}

/** "Traceability complete" per norm requiring traceability that has in-scope activities in the document. */
export function normTraceability(defs: XElement, norms: readonly string[] = TRACE_NORMS): NormTrace[] {
  const g = traceGraph(defs), facts = [...activityFacts(defs).values()].filter((f: ActFact) => f.inScope && f.norm !== undefined);
  const missing = new Set(g.missing.map((m) => m.activity));
  return norms.flatMap((norm) => {
    const acts = facts.filter((f) => f.norm === norm).map((f) => f.id);
    if (!acts.length) return [];
    const noInput = acts.filter((a) => !g.inputs.has(a)), noOutput = acts.filter((a) => !g.outputs.has(a)), missingInput = acts.filter((a) => missing.has(a));
    return [{ norm, activities: acts.length, noInput, noOutput, missingInput, complete: !noInput.length && !noOutput.length && !missingInput.length }];
  });
}
