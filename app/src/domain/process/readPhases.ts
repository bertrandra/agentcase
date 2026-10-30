/** @calc-zone process-model */
import type { BpsimValues } from './bpsim';
import { extOf, marks, num, type ActivityView, type FlowView, type PhaseView, type ReworkView } from './readTypes';
import { TYPE_OF_TASK } from './types';
import { attr, kid, kids, NS, textOf, type XElement } from './xml';

const TASKS: readonly string[] = ['task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask', 'businessRuleTask', 'sendTask', 'receiveTask'];
const PHASES: readonly string[] = ['subProcess', 'adHocSubProcess'];
const refText = (e: XElement | undefined, local: string): string | undefined => {
  const r = e ? kid(e, NS.bpmn, local) : undefined;
  return r ? textOf(r).trim() : undefined;
};
const docText = (e: XElement): string | undefined => { const d = kid(e, NS.bpmn, 'documentation'); return d ? textOf(d) : undefined; };
const str = (v: string | undefined): string => v ?? '';
/** BPSim values by element id (`readBpsim`): read only where the `ac:` value is absent (D-B5). */
export type Sim = ReadonlyMap<string, BpsimValues>;
const NONE: Sim = new Map();

/** The phases of a process: its top-level sub-processes (Cross-cutting is the ad-hoc one), with the case's marks. */
export function phasesOf(proc: XElement): { view: PhaseView; el: XElement }[] {
  return kids(proc, NS.bpmn).filter((e) => PHASES.includes(e.local)).map((e) => {
    const p = extOf(e, 'phase'), a = (n: string) => (p ? attr(p, n) : undefined), fid = a('featureIds'), ramp = a('rampSeq');
    const view: PhaseView = {
      id: str(attr(e, 'id')), name: str(attr(e, 'name')), adHoc: e.local === 'adHocSubProcess', seq: num(a('seq')) ?? 0, role: str(a('role')),
      sdlc: num(a('sdlc')) ?? 0, reg: num(a('reg')) ?? 0, ...marks(e, p, 'offRank'),
    };
    const order = num(a('order')), rampRank = num(a('rampRank'));
    if (order !== undefined) view.order = order;
    if (fid !== undefined) view.featureIds = fid ? fid.split(' ') : [];
    if (ramp !== undefined) view.rampSeq = ramp === '' ? null : Number(ramp);
    if (rampRank !== undefined) view.rampRank = rampRank;
    return { view, el: e };
  });
}

/** One task of a phase as a typed activity. */
function activityOf(e: XElement, phase: string, deliverables: Map<string, string>, sim: Sim): ActivityView {
  const id = str(attr(e, 'id')), p = extOf(e, 'activity'), s = extOf(e, 'supervision'), a = (n: string) => (p ? attr(p, n) : undefined);
  const sv = (n: string) => (s ? num(attr(s, n)) : undefined);
  const v: ActivityView = {
    id, name: str(attr(e, 'name')), phase, element: e.local, type: a('type') ?? TYPE_OF_TASK[e.local] ?? 'Human',
    regulatory: a('regulatory') === 'true', order: num(a('order')) ?? 0, effort: num(a('effort')) ?? sim.get(id)?.time ?? 0, value: str(a('value')),
    aiAuthority: str(a('aiAuthority')), storyId: a('storyId') ?? null, human: sv('human') ?? 0, agent: sv('agent') ?? 0, ...marks(e, p, 'scopeRank'),
  };
  const opt: Partial<ActivityView> = {
    seq: num(a('seq')), weight: num(a('weight')), capability: a('capability'), agent0: sv('agent0'), documentation: docText(e),
    deliverable: deliverables.get(refText(kid(e, NS.bpmn, 'dataOutputAssociation'), 'targetRef') ?? ''),
    norm: refText(e, 'categoryValueRef'), performer: refText(kid(e, NS.bpmn, 'performer'), 'resourceRef'),
    humanPerformer: refText(kid(e, NS.bpmn, 'humanPerformer'), 'resourceRef'), editRank: num(a('editRank')),
    edited: a('edited')?.split(' ').filter(Boolean),
  };
  for (const [k, x] of Object.entries(opt)) if (x !== undefined) Object.assign(v, { [k]: x });
  return v;
}

/** The activities of a phase sub-process, in document order. */
export function activitiesOf(phase: XElement, sim: Sim = NONE): ActivityView[] {
  const id = str(attr(phase, 'id')), deliverables = new Map<string, string>();
  for (const d of kids(phase, NS.bpmn, 'dataObject')) deliverables.set(str(attr(d, 'id')), docText(d) ?? '');
  return kids(phase, NS.bpmn).filter((e) => TASKS.includes(e.local)).map((e) => activityOf(e, id, deliverables, sim));
}

/** The sequence flows directly inside a container (process or sub-process), with their rework parameters (BPSim probability as fallback). */
export function flowsIn(container: XElement, sim: Sim = NONE): FlowView[] {
  const cid = str(attr(container, 'id'));
  return kids(container, NS.bpmn, 'sequenceFlow').map((e) => {
    const f: FlowView = { id: str(attr(e, 'id')), source: str(attr(e, 'sourceRef')), target: str(attr(e, 'targetRef')), container: cid };
    const name = attr(e, 'name'), r = extOf(e, 'rework'), sp = sim.get(f.id)?.probability;
    if (name !== undefined) f.name = name;
    if (!r && sp !== undefined) f.probability = sp;
    if (r) {
      const n = (k: string) => num(attr(r, k)) ?? 0, note = attr(r, 'note');
      const rw: ReworkView = { order: n('order'), probability: num(attr(r, 'probability')) ?? sp ?? 0, costShare: n('costShare'),
        internalIterations: n('internalIterations'),
        activityA: str(attr(r, 'activityA')), activityB: str(attr(r, 'activityB')), external: attr(r, 'external') === 'true' };
      if (note !== undefined) rw.note = note;
      f.rework = rw;
    }
    return f;
  });
}
