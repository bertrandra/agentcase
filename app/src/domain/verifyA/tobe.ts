import { LOCATIONS } from '../catalog';
import { artTeamSkill, REG_TEAM_SKILLS, SKILL_MAP_DEFAULT, skillMapOf } from '../baseline/skills';
import { pinIndex } from '../baseline/teamWeights';
import { activeArtefacts } from '../scope';
import type { CaseState } from '../types/state';
import type { Live } from './fteVfte';

/** Every team skill: the targets of the skill map, the compliance skills and whatever the AS-IS team already has. */
export function teamSkillList(s: CaseState): string[] {
  const set = new Set<string>(Object.values(skillMapOf(s)));
  REG_TEAM_SKILLS.forEach((x) => set.add(x));
  s.teamIn.forEach((r) => set.add(r.skill));
  return [...set].sort();
}

/** Artefact skill labels of the in-scope SDLC artefacts (regulatory ones follow their industry, not this map). */
export function allArtefactSkills(l: Live): string[] {
  const set = new Set<string>();
  activeArtefacts(l.c.a, l.c.s).forEach((a) => { if (!a.isReg) set.add(a.skill); });
  return [...set].sort();
}

export interface TobeYear { human: number; agent: number; autoPct: number }
export interface TobeRow { skill: string; asisFTE: number; perYear: TobeYear[] }
export interface TobeComposition { rows: TobeRow[]; tot: { asis: number; sumAsis: number; human: number; agent: number }; years: number[] }

/** Residual human FTE and agent vFTE by team skill for year index `year` (0-based, clamped): reconciles to the aggregate model (legacy tobeComposition). */
export function tobeComposition(l: Live, year: number): TobeComposition {
  const { c, m, eng } = l, s = c.s, map = skillMapOf(s), pin = pinIndex(s.teamIn);
  const totalFTE = s.teamIn.reduce((t, r) => t + (+r.etp || 0), 0);
  const eff: Record<string, number> = {}, raw: Record<string, number> = {};
  teamSkillList(s).forEach((ts) => { eff[ts] = 0; raw[ts] = 0; });
  let totW = 0, totalRaw = 0;
  activeArtefacts(c.a, s).forEach((a) => {
    const i = pin[a.id], ts = i != null && s.teamIn[i] ? s.teamIn[i]!.skill : artTeamSkill(a, map), ew = +a.w || 0, rawAg = ew * ((+a.agentSup || 0) / 100);
    eff[ts] = (eff[ts] ?? 0) + ew; raw[ts] = (raw[ts] ?? 0) + rawAg; totW += ew; totalRaw += rawAg;
  });
  totW = totW || 1;
  const rawTot = totalRaw || 1, years = eng.years().map((y) => (y.adoptionEndPct / 100) * (m.eff / 100)), y = Math.min(year, years.length - 1);
  const rows = Object.keys(eff).filter((ts) => (eff[ts] as number) > 0).sort().map((ts) => {
    const asisFTE = (totalFTE * (eff[ts] as number)) / totW;
    const perYear = years.map((A) => {
      const agent = totalFTE * A * ((raw[ts] as number) / rawTot), human = Math.max(0, asisFTE - agent);
      return { human, agent, autoPct: asisFTE > 0 ? Math.min(100, (agent / asisFTE) * 100) : 0 };
    });
    return { skill: ts, asisFTE, perYear };
  });
  const sum = (f: (r: TobeRow) => number) => rows.reduce((t, r) => t + f(r), 0);
  return { rows, years, tot: { asis: totalFTE, sumAsis: sum((r) => r.asisFTE), human: sum((r) => r.perYear[y]!.human), agent: sum((r) => r.perYear[y]!.agent) } };
}

export type LocSplit = Record<string, Record<string, number>>;

/** The AS-IS location mix of each skill in whole percent (100 on the first location for an unstaffed skill), drift fixed on the largest bucket. */
export function tobeSkillLocDefault(s: CaseState): LocSplit {
  const locs = LOCATIONS.map((x) => x.name), acc: LocSplit = {}, out: LocSplit = {};
  teamSkillList(s).forEach((ts) => { acc[ts] = {}; });
  s.teamIn.forEach((r) => { const a = (acc[r.skill] ??= {}); a[r.loc] = (a[r.loc] || 0) + (+r.etp || 0); });
  teamSkillList(s).forEach((ts) => {
    const d = acc[ts] ?? {}, tot = Object.values(d).reduce((t, v) => t + v, 0), o: Record<string, number> = (out[ts] = {});
    locs.forEach((x) => { o[x] = tot > 0 ? Math.round(((d[x] || 0) / tot) * 100) : 0; });
    if (tot === 0) o[locs[0] as string] = 100;
    const sum = locs.reduce((t, x) => t + (o[x] as number), 0);
    if (sum !== 100) { let mx = locs[0] as string; locs.forEach((x) => { if ((o[x] as number) > (o[mx] as number)) mx = x; }); o[mx] = (o[mx] as number) + (100 - sum); }
  });
  return out;
}

/** The split in force: the case's own (`tobeLocSplit`), completed with the AS-IS default for skills it does not know. */
export function locSplitOf(s: CaseState): LocSplit {
  const own = (s as unknown as { tobeLocSplit?: LocSplit | null }).tobeLocSplit, def = tobeSkillLocDefault(s);
  return own && typeof own === 'object' ? { ...def, ...own } : def;
}

/** AS-IS grade mix of a skill priced at a target location (grade family = first letter). */
export function skillGradeRate(s: CaseState, skill: string, loc: string): number {
  const g: Record<string, number> = {};
  let tot = 0;
  s.teamIn.forEach((r) => { if (r.skill !== skill) return; const fam = String(r.grade || 'C')[0] as string; g[fam] = (g[fam] || 0) + (+r.etp || 0); tot += +r.etp || 0; });
  const rl = s.RATE[loc] ?? {};
  if (tot === 0) return rl['C'] || 500;
  return Object.keys(g).reduce((rate, fam) => rate + ((rl[fam] || rl['C'] || 500) * (g[fam] as number)) / tot, 0);
}

export interface TobeLocRow { loc: string; cls: string; fte: number; cost: number }

/** Resulting TO-BE human team by location (only locations holding someone) and its indicative annual cost. */
export function tobeLocResult(l: Live, comp: TobeComposition, year: number): { rows: TobeLocRow[]; fte: number; cost: number; wd: number } {
  const s = l.c.s, split = locSplitOf(s), wd = l.m.wd || 220, y = Math.min(year, comp.years.length - 1);
  const fte: Record<string, number> = {}, cost: Record<string, number> = {};
  LOCATIONS.forEach((x) => { fte[x.name] = 0; cost[x.name] = 0; });
  comp.rows.forEach((r) => {
    const sp = split[r.skill] ?? {}, h = r.perYear[y]!.human;
    LOCATIONS.forEach((x) => { const f = (h * (+(sp[x.name] ?? 0) || 0)) / 100; fte[x.name]! += f; cost[x.name]! += f * skillGradeRate(s, r.skill, x.name) * wd; });
  });
  const rows = LOCATIONS.filter((x) => (fte[x.name] as number) > 0.001).map((x) => ({ loc: x.name, cls: x.cls, fte: fte[x.name] as number, cost: cost[x.name] as number }));
  return { rows, fte: LOCATIONS.reduce((t, x) => t + (fte[x.name] as number), 0), cost: LOCATIONS.reduce((t, x) => t + (cost[x.name] as number), 0), wd };
}

export { SKILL_MAP_DEFAULT };
