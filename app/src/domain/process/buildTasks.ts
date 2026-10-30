/** @calc-zone process-model */
import { agentId, dataId, normId, outId, roleId, teamRoleId } from './ids';
import { TASK_OF_TYPE, type CatArtefact } from './types';
import { el, text, type XElement, type XNode } from './xml';

const ref = (qname: string, id: string): XElement => el(qname, {}, [text(id)]);
const performer = (qname: string, resource: string): XElement => el(qname, {}, [ref('bpmn:resourceRef', resource)]);

/** `implementation` of an agent's service task (§ 4.2): the AgentCase agent technology, so tools do not take it for a web service. */
export const AGENT_IMPLEMENTATION = 'https://agentcase.app/schema/bpmn/1.0#agent';

/**
 * One catalogue artefact as a BPMN task (spec § 3, § 4.2, § 5.2): the element is typed by the activity type, the parameters sit in
 * `ac:activity` (type and phase included, as the extension XSD requires) and `ac:supervision`, the norm is a category value, the
 * deliverable a data object, the actors resource roles; an agent's service task names its agent (`implementation`, `ac:agent`).
 * `order` is the artefact's position in its catalogue list (the order the engine iterates).
 */
export function taskOf(a: CatArtefact, order: number, regulatory: boolean): XElement {
  if (regulatory && a.skill !== a.norm) throw new Error(`process: regulatory artefact ${a.id} has skill ${a.skill} != norm ${a.norm ?? ''}`);
  const type = a.agentActivityType ?? 'Human', local = TASK_OF_TYPE[type];
  if (!local) throw new Error(`process: unknown activity type ${type} on ${a.id}`);
  const children: XNode[] = [];
  if (regulatory && a.purpose) children.push(el('bpmn:documentation', {}, [text(a.purpose)]));
  children.push(el('bpmn:extensionElements', {}, [
    el('ac:activity', {
      type, phase: a.phase, order, seq: a.seq, effort: a.effort, weight: a.w, value: a.value, capability: a.capability, aiAuthority: a.aiAuth,
      storyId: a.storyId, regulatory: regulatory ? 'true' : null,
    }),
    el('ac:supervision', { human: a.humanSup, agent: a.agentSup, agent0: a._agent0 }),
  ]));
  if (regulatory) children.push(ref('bpmn:categoryValueRef', normId(a.industry ?? '', a.norm ?? '')));
  if (!regulatory && a.deliverable) children.push(el('bpmn:dataOutputAssociation', { id: outId(a.id) }, [ref('bpmn:targetRef', dataId(a.id))]));
  const agent = type === 'Agent' ? agentId(a.capability ?? 'Agent') : null;
  if (agent) children.push(performer('bpmn:performer', agent));
  children.push(performer('bpmn:humanPerformer', regulatory ? teamRoleId(a.teamSkill ?? 'Regulatory Affairs') : roleId(a.skill)));
  return el(`bpmn:${local}`, { id: a.id, name: a.name, implementation: agent ? AGENT_IMPLEMENTATION : null, 'ac:agent': agent }, children);
}

/** The deliverable of an SDLC artefact: a data object whose documentation is the deliverable text. */
export const dataObjectOf = (a: CatArtefact): XElement =>
  el('bpmn:dataObject', { id: dataId(a.id) }, [el('bpmn:documentation', {}, [text(a.deliverable)])]);
