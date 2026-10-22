/** @calc-zone delivery-views */
import { current } from 'immer';
import { SKILL_MAP_DEFAULT } from '@/domain/baseline/skills';
import { skillMapOf } from '@/domain/baseline/skills';
import { locSplitOf, tobeSkillLocDefault } from '@/domain/verifyA/tobe';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

const snap = (d: Doc): Doc => current(d) as Doc;

// ---- TO-BE team: artefact skill -> team skill map ----
const setSkillMapCmd = defineCommand<{ artSkill: string; teamSkill: string }>({
  type: 'verify.setSkillMap', label: (p) => `Map artefact skill ${p.artSkill} to ${p.teamSkill}`,
  run(d, p) { d.skillMap = { ...skillMapOf(snap(d)), [p.artSkill]: p.teamSkill }; },
});
const resetSkillMapCmd = defineCommand<Record<string, never>>({
  type: 'verify.resetSkillMap', label: () => 'Reset the skill mapping to defaults', run(d) { d.skillMap = { ...SKILL_MAP_DEFAULT }; },
});

// ---- TO-BE team: target location split per skill ----
const setTobeLocCmd = defineCommand<{ skill: string; loc: string; value: number | string }>({
  type: 'verify.setTobeLoc', label: (p) => `Set TO-BE ${p.skill} share in ${p.loc}`, coalesceKey: (p) => `verify.setTobeLoc:${p.skill}:${p.loc}`,
  run(d, p) {
    const split = locSplitOf(snap(d)), n = Math.max(0, Math.min(100, parseFloat(String(p.value)) || 0));
    d.tobeLocSplit = { ...split, [p.skill]: { ...(split[p.skill] ?? {}), [p.loc]: n } };
  },
});
const resetTobeLocCmd = defineCommand<Record<string, never>>({
  type: 'verify.resetTobeLoc', label: () => 'Reset the TO-BE location split to the AS-IS mix', run(d) { d.tobeLocSplit = tobeSkillLocDefault(snap(d)); },
});

const go = <P>(cmd: ReturnType<typeof defineCommand<P>>, p: P): void => appStore().dispatch(cmd(p));
export const setSkillMap = (artSkill: string, teamSkill: string): void => go(setSkillMapCmd, { artSkill, teamSkill });
export const resetSkillMap = (): void => go(resetSkillMapCmd, {});
export const setTobeLoc = (skill: string, loc: string, value: number | string): void => go(setTobeLocCmd, { skill, loc, value });
export const resetTobeLoc = (): void => go(resetTobeLocCmd, {});
