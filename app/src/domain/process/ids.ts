/** @calc-zone process-model */
/** Stable element ids of the generated process (F-B4): derived from catalogue ids and labels only, never from a counter or a clock. */
export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const roleId = (skill: string): string => `role-${slug(skill)}`;
export const teamRoleId = (teamSkill: string): string => `team-${slug(teamSkill)}`;
export const agentId = (capability: string): string => `agent-${slug(capability)}`;
export const industryId = (industry: string): string => `industry-${slug(industry)}`;
export const normId = (industry: string, name: string): string => `norm-${slug(industry)}-${slug(name)}`;
export const laneId = (teamSkill: string): string => `lane-${slug(teamSkill)}`;
export const dataId = (activity: string): string => `${activity}_data`;
export const outId = (activity: string): string => `${activity}_out`;
export const diId = (id: string): string => `${id}_di`;
export const flowId = (from: string, to: string): string => `Flow_${from}_${to}`;
/** The key a case uses for a norm in `selectedNorms`. */
export const normKey = (industry: string, name: string): string => `${industry}:${name}`;

export const PROCESS_ID = 'Process';
export const START_ID = 'Start';
export const END_ID = 'End';
export const FORK_ID = 'Fork';
export const JOIN_ID = 'Join';
export const CROSS_LANE_ID = 'lane-cross-cutting';
