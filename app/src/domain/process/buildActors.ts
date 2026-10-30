/** @calc-zone process-model */
import { agentId, industryId, normId, roleId, teamRoleId } from './ids';
import type { ProcessCatalogue } from './types';
import { el, type XElement } from './xml';

const uniq = (xs: string[]): string[] => [...new Set(xs)];
const resource = (id: string, name: string, actor: Record<string, string | null>): XElement =>
  el('bpmn:resource', { id, name }, [el('bpmn:extensionElements', {}, [el('ac:actor', actor)])]);

/** A role of the skill vocabulary: an artefact skill and the team skill it maps to (legacy skillMap; no team skill when unmapped). */
export const roleResource = (skill: string, teamSkill: string | undefined): XElement =>
  resource(roleId(skill), skill, { kind: 'role', teamSkill: teamSkill ?? null });

/**
 * The actors (spec § 3, § 16.4): one role per artefact skill (the skill map's keys first, in map order, then any unmapped skill), one role
 * per team skill that performs regulatory work directly, one agent per capability that an Agent activity uses.
 */
export function actorsOf(c: ProcessCatalogue): XElement[] {
  const skills = uniq([...Object.keys(c.skillMap), ...c.sdlc.map((a) => a.skill)]);
  const regTeams = uniq(c.reg.map((a) => a.teamSkill ?? 'Regulatory Affairs'));
  const caps = uniq([...c.sdlc, ...c.reg].filter((a) => a.agentActivityType === 'Agent').map((a) => a.capability ?? 'Agent'));
  return [
    ...skills.map((s) => roleResource(s, c.skillMap[s])),
    ...regTeams.map((t) => resource(teamRoleId(t), t, { kind: 'role', teamSkill: t, regulatory: 'true' })),
    ...caps.map((k) => resource(agentId(k), `${k} agent`, { kind: 'agent', capability: k })),
  ];
}

/** The norms (spec § 3): one category per industry, one category value per norm, its attributes in `ac:norm`. */
export function normsOf(c: ProcessCatalogue): XElement[] {
  const industries = uniq(c.norms.map((n) => n.industry));
  return industries.map((ind) => el('bpmn:category', { id: industryId(ind), name: ind }, c.norms.filter((n) => n.industry === ind).map((n) =>
    el('bpmn:categoryValue', { id: normId(n.industry, n.name), value: n.name }, [
      el('bpmn:extensionElements', {}, [el('ac:norm', { industry: n.industry, body: n.body, scope: n.scope, count: n.count })]),
    ]))));
}
