import type { Ctx } from '../ctx';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import { fgGrid, fgPhaseWindows } from './grid';
import { tagMap } from './tags';
import type { FgParams } from './types';

export interface Preflight { ok: boolean; weeks: number; from: string; to: string; phases: number; arts: number; stories: number; releases: number; est: number; cap: number }

/** What a generation would produce from the current scope: weeks, phases, artefacts, stories, releases and the estimated record count against the cap. */
export function fgPreflight(c: Ctx, p: FgParams): Preflight {
  const grid = fgGrid(c), win = fgPhaseWindows(c, grid), act = activeArtefacts(c.a, c.s), m = model(c);
  const tags = tagMap(c), caps = new Set(act.map((a) => `${a.phase || ''}|${tags.get(a.id)?.capability || 'General'}`));
  const phases = Object.keys(win).length, relN = Math.floor(grid.totalW / p.releaseEveryWeeks);
  const agentWk = (((m.agentRunsYear ? (m.agentRunsYear[1] as number) : 0) / 52.18) * p.commitsPerAgentRun), humanWk = (m.yearETP[1] as number) * p.humanCommitsPerDevWeek;
  const est = Math.round((agentWk + humanWk) * p.density * grid.totalW * 0.6 + p.buildsPerWeek * p.density * grid.totalW * (1 + p.artefactsPerBuild * 6) + relN * 14);
  return { ok: phases > 0, weeks: grid.totalW, from: grid.date(1), to: grid.date(grid.totalW), phases, arts: act.length, stories: caps.size, releases: relN, est, cap: p.maxRecords };
}
