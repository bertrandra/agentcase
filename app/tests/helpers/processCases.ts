import { readFileSync } from 'node:fs';
import type { CaseState } from '@/domain';
import { resolveProduct } from '@/domain/portfolio';
import { addActivity, addActor, addPhase, el, readProcess, setScope, type CatArtefact, type XDocument } from '@/domain/process';
import { appendChild, editById } from '@/domain/process/editTree';
import { openChecked } from '@/store/persistence/schema';

/**
 * Reference cases of phase B5 (docs/SPEC_BPMN.md § 7 phase 2, F-B18, D-B20): an oracle fixture opened as the application opens it (schema v3,
 * the process document in `BPMN`), then edited with the domain's process commands: custom activities, roles, agents, phases and rework paths.
 */
export const opened = (id: string): CaseState => {
  const pf = openChecked(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as Record<string, unknown>).portfolio;
  return resolveProduct(pf, pf.activeProductId) as CaseState;
};
export const withDoc = (s: CaseState, d: XDocument, patch: Partial<CaseState> = {}): CaseState => ({ ...s, ...patch, BPMN: d });

/** A custom activity (F-B18: phase, type, actor role, effort, value class, AI authority, supervision split). */
export const custom = (id: string, p: Partial<CatArtefact> = {}): CatArtefact => ({
  id, name: `Custom ${id}`, phase: 'V3', value: 'VA', skill: 'Dev', aiAuth: 'Supervised autonomous', humanSup: 60, agentSup: 40, effort: 7, deliverable: '',
  agentActivityType: 'Human', capability: 'Coding', ...p,
});

/** Every catalogue activity switched out of scope: the custom ones are the whole selection (the hand computations then read them alone). */
export const emptied = (d: XDocument): XDocument => setScope(d, readProcess(d).activities.map((a) => a.id), false);

/** Activities added in order (each in scope). */
export const adding = (d: XDocument, ...acts: CatArtefact[]): XDocument => acts.reduce((x, a) => addActivity(x, a), d);

/** A custom role (`role-<slug>`, the id an activity's skill resolves to) attached to a team skill. */
export const withRole = (d: XDocument, name: string, teamSkill: string): XDocument =>
  addActor(d, { id: `role-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, kind: 'role', teamSkill });
/** A custom agent (`agent-<slug of its capability>`, the performer of an Agent activity of that capability). */
export const withAgent = (d: XDocument, capability: string): XDocument =>
  addActor(d, { id: `agent-${capability.toLowerCase()}`, name: `${capability} agent`, kind: 'agent', capability });
export const withPhase = (d: XDocument, id: string): XDocument => addPhase(d, { id, name: `Phase ${id}` });

/**
 * An error boundary event on `on` (an activity, or a phase) with its rework parameters, and the sequence flow back to `to` (F-B47, D-B20), both
 * written in `container` (the phase holding `on`, or `Process` for a phase). `pair` names the back flow it replaces.
 */
export function withBoundary(d: XDocument, o: { id: string; container: string; on: string; to: string; p: number; share: number; pair?: string }): XDocument {
  const ev = el('bpmn:boundaryEvent', { id: o.id, name: `Defect escaped ${o.id}`, attachedToRef: o.on }, [
    el('bpmn:extensionElements', {}, [el('ac:rework', { probability: o.p, costShare: o.share, pair: o.pair })]),
    el('bpmn:errorEventDefinition', { id: `${o.id}_ed` }),
  ]);
  const flow = el('bpmn:sequenceFlow', { id: `${o.id}_flow`, sourceRef: o.id, targetRef: o.to });
  return { ...d, root: editById(d.root, o.container, (c) => appendChild(appendChild(c, ev), flow)) };
}
