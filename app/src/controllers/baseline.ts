/** @calc-zone rate-card-team */
import { currentOf } from '@/store/draftValue';
import { activeArtefacts, makeCtx } from '@/domain';
import { defaultGradeLoc } from '@/domain/baseline/skills';
import { targetMix } from '@/domain/baseline/locStrat';
import { alignTeamRows, buildTeamRows, scaleRows } from '@/domain/baseline/teamMix';
import { FTE_STEP } from '@/domain/baseline/apportion';
import { ownRows, sharedEtp } from '@/domain/portfolio';
import type { TeamRow } from '@/domain/types/state';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

const snap = (d: Doc): Doc => currentOf(d) as Doc;
const num = (v: unknown): number => parseFloat(String(v)) || 0;

// ---- Rate card ----
const setRateCmd = defineCommand<{ loc: string; band: string; value: number | string }>({
  type: 'baseline.setRate', label: (p) => `Set ${p.loc} band ${p.band} day rate`, coalesceKey: (p) => `baseline.setRate:${p.loc}:${p.band}`,
  run(d, p) { (d.RATE[p.loc] ??= {})[p.band] = num(p.value); },
});

// ---- Location strategy ----
const setTargetLocCmd = defineCommand<{ loc: string; value: number | string }>({
  type: 'baseline.setTargetLoc', label: (p) => `Set target ${p.loc} share`, coalesceKey: (p) => `baseline.setTargetLoc:${p.loc}`,
  run(d, p) { const t = { ...targetMix(snap(d)) }; t[p.loc] = num(p.value); d.targetLocPct = t; },
});
const resetTargetLocCmd = defineCommand<Record<string, never>>({
  type: 'baseline.resetTargetLoc', label: () => 'Copy the AS-IS location mix to the target',
  run(d) { d.targetLocPct = targetMix({ ...snap(d), targetLocPct: null }); },
});

// ---- Input team: whole-team actions and pins ----
const replaceRows = (d: Doc, rows: TeamRow[] | null) => { if (rows) d.teamIn = rows; };
/**
 * The whole-team actions work on the product's OWN rows: the contributions of shared lines keep their FTE (they are edited in the Products section),
 * so the case they see is the case without them. Without shared lines this is the case itself.
 */
const ownCase = (d: Doc): Doc => { const s = snap(d), own = ownRows(s.teamIn); return own === s.teamIn ? s : { ...s, teamIn: own }; };
const setTotalCmd = defineCommand<{ value: number | string }>({
  type: 'baseline.setTeamTotal', label: (p) => `Scale the AS-IS team to ${p.value} FTE`, coalesceKey: () => 'baseline.setTeamTotal',
  run(d, p) { const sh = sharedEtp(snap(d).teamIn); replaceRows(d, scaleRows(ownCase(d).teamIn, sh ? num(p.value) - sh : p.value)); },
});
const buildCmd = defineCommand<Record<string, never>>({
  type: 'baseline.buildTeam', label: () => 'Build the team from the artefact mix', run(d) { replaceRows(d, buildTeamRows(makeCtx(ownCase(d)))); },
});
const alignCmd = defineCommand<Record<string, never>>({
  type: 'baseline.alignTeam', label: () => 'Align team FTE to the artefact mix', run(d) { replaceRows(d, alignTeamRows(makeCtx(ownCase(d)))); },
});
const addForCmd = defineCommand<{ skill: string }>({
  type: 'baseline.addTeamRowFor', label: (p) => `Add an auto line for ${p.skill}`,
  run(d, p) { const [grade, loc] = defaultGradeLoc(p.skill); d.teamIn.push({ skill: p.skill, grade, loc, etp: FTE_STEP, pins: [] }); },
});

const unpin = (d: Doc, ids: string[]) => d.teamIn.forEach((r) => { if (r.pins) r.pins = (r.pins as string[]).filter((x) => !ids.includes(x)); });
const pinTo = (d: Doc, row: number, ids: string[]) => { const r = d.teamIn[row]; if (r) r.pins = ((r.pins ?? []) as string[]).concat(ids); };
const setPinCmd = defineCommand<{ row: number; id: string; on: boolean }>({
  type: 'baseline.setPin', label: (p) => `${p.on ? 'Pin' : 'Unpin'} ${p.id} ${p.on ? 'to' : 'from'} team line ${p.row + 1}`,
  run(d, p) { if (!d.teamIn[p.row]) return; unpin(d, [p.id]); if (p.on) pinTo(d, p.row, [p.id]); },
});
const clearPinsCmd = defineCommand<{ row: number }>({
  type: 'baseline.clearPins', label: (p) => `Clear the pins of team line ${p.row + 1}`,
  run(d, p) { const r = d.teamIn[p.row]; if (r) r.pins = []; },
});
const pinPhaseCmd = defineCommand<{ row: number; phase: string; on: boolean }>({
  type: 'baseline.pinPhase', label: (p) => `${p.on ? 'Pin' : 'Unpin'} all of phase ${p.phase} ${p.on ? 'to' : 'from'} team line ${p.row + 1}`,
  run(d, p) {
    if (p.on && !d.teamIn[p.row]) return;
    const c = makeCtx(snap(d)), ids = activeArtefacts(c.a, c.s).filter((a) => a.phase === p.phase).map((a) => a.id);
    unpin(d, ids); if (p.on) pinTo(d, p.row, ids);
  },
});

const go = <P>(cmd: ReturnType<typeof defineCommand<P>>, p: P): void => appStore().dispatch(cmd(p));
export const setRate = (loc: string, band: string, value: number | string): void => go(setRateCmd, { loc, band, value });
export const setTargetLoc = (loc: string, value: number | string): void => go(setTargetLocCmd, { loc, value });
export const resetTargetLoc = (): void => go(resetTargetLocCmd, {});
export const setTeamTotal = (value: number | string): void => go(setTotalCmd, { value });
export const buildTeam = (): void => go(buildCmd, {});
export const alignTeam = (): void => go(alignCmd, {});
export const addTeamRowFor = (skill: string): void => go(addForCmd, { skill });
export const setPin = (row: number, id: string, on: boolean): void => go(setPinCmd, { row, id, on });
export const clearPins = (row: number): void => go(clearPinsCmd, { row });
export const pinPhase = (row: number, phase: string, on: boolean): void => go(pinPhaseCmd, { row, phase, on });
