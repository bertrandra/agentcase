import type { WArtefact } from '../artefacts';
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { aiQualityTaxFactor } from '../model/vtax';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import type { ModelResult } from '../types/model';
import agents from './agents.json';
import { fgGrid, fgPhaseWindows, type Grid, type PhaseWindow } from './grid';
import { EMPTY_FACTORY } from './empty';
import { runRelease } from './release';
import { fgStructure } from './structure';
import { tagMap } from './tags';
import type { FactoryData, FgParams, FgProvenance } from './types';

const AUTH: Record<string, number> = { Assistance: 0.3, Copilot: 0.6, 'Supervised autonomous': 0.85, Autonomous: 1 };
/** Share of an artefact's commits authored by agents: permitted by authorisation x supervision, scaled by the ramp, never below the human floor. */
export function fgAgentShare(a: WArtefact, ramp: number): number {
  const cap = AUTH[a.aiAuth] != null ? (AUTH[a.aiAuth] as number) : 0.6, permitted = ((+a.agentSup || 0) / 100) * cap;
  return Math.max(0, Math.min(Math.min(permitted, permitted * (ramp / 100)), 1 - (+a.humanSup || 0) / 100));
}
/** Seeded PRNG of the generator (no Math.random anywhere). */
export function fgRng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Mutable collections + counters shared by the weekly passes. */
export interface Gen { d: FactoryData; cnt: number; cap: number; rnd: () => number; p: FgParams; grid: Grid; relN: number; lastRelease: number; vol: number; D: number }

/** Commits of one week: volume from the case, authorship from supervision x authorisation x ramp. */
function weekCommits(g: Gen, c: Ctx, m: ModelResult, w: number, year: number, ramp: number, arts: WArtefact[], team: Ctx['s']['teamIn']) {
  const { p, rnd } = g, at = (a: number[] | undefined, i: number) => (a ? (a[i] as number) : 0);
  const WT = arts.reduce((t, a) => t + (+a.w || 0), 0) || 1;
  const wk = (at(m.agentRunsYear, year) / 52.18) * p.commitsPerAgentRun + (m.yearETP[year] as number) * p.humanCommitsPerDevWeek;
  const openShare = WT / (activeArtefacts(c.a, c.s).reduce((t, a) => t + (+a.w || 0), 0) || 1);
  const n = Math.max(1, Math.round(wk * openShare * g.D * g.vol));
  for (let i = 0; i < n && g.cnt < g.cap; i++) {
    const r = rnd() * WT;
    let acc = 0, a = arts[0] as WArtefact;
    for (const x of arts) { acc += +x.w || 0; if (r <= acc) { a = x; break; } }
    const isAgent = rnd() < fgAgentShare(a, ramp);
    const ag = agents.find((x) => x.artifactIds.includes(a.id));
    const author = isAgent ? (ag ? `agent:${ag.id} — ${ag.skill} / ${ag.aiAuth}` : `agent:auto — ${a.skill || 'Software'} / ${a.aiAuth || 'Copilot'}`)
      : (() => { const t = team[Math.floor(rnd() * team.length) % team.length]; return `${t?.grade || 'Engineer'} ${t?.skill || a.skill || 'Software'} · ${t?.loc || 'FR'}`; })();
    g.d.COMMITS.push({ id: 'cm-' + g.d.COMMITS.length, taskId: (a.isReg ? 'reg:' : 'sdlc:') + a.id, message: `${isAgent ? '[agent] ' : ''}${a.name || a.id} — w${w}`,
      author, committedAt: g.grid.date(w, Math.floor(rnd() * 5)) });
    g.cnt++;
  }
}

const GATES = ['Unit coverage ≥80%', 'SAST', 'Contract tests', 'Performance', 'Licence & SBOM'];
/** Builds of one week, with their artefacts and quality gates. */
function weekBuilds(g: Gen, c: Ctx, w: number, year: number, open: string[]) {
  const { p, rnd, d } = g, nb = Math.max(1, Math.round(p.buildsPerWeek * g.D * g.vol));
  for (let b = 0; b < nb && g.cnt < g.cap; b++) {
    const ok = rnd() >= p.buildFailRate, bid = 'bd-' + d.BUILDS.length;
    d.BUILDS.push({ id: bid, name: `build-w${w}-${b}`, status: ok ? 'Success' : 'Failed', builtAt: g.grid.date(w, b % 5) });
    g.cnt++;
    if (!ok) continue;
    for (let q = 0; q < p.artefactsPerBuild && g.cnt < g.cap; q++) {
      const baid = 'ba-' + d.BUILD_ARTIFACTS.length;
      d.BUILD_ARTIFACTS.push({ id: baid, name: `${open[0] || 'pkg'}-artifact-${d.BUILD_ARTIFACTS.length}`, buildId: bid, type: 'Package', version: `1.${year}.${d.BUILD_ARTIFACTS.length}` });
      g.cnt++;
      GATES.forEach((name) => {
        if (g.cnt >= g.cap) return;
        d.QUALITY_GATES.push({ id: 'qg-' + d.QUALITY_GATES.length, name, buildArtifactId: baid, result: rnd() < p.gateFailRate * aiQualityTaxFactor(c) ? 'Fail' : 'Pass' });
        g.cnt++;
      });
    }
  }
}

export interface Generated { data: FactoryData; phaseFeatures: Record<string, string[]>; storyOf: Record<string, string>; provenance: FgProvenance }
/** The weekly factory dataset of a case (spec FactoryWeeklyGeneration): schedule-driven, seeded, down-sampled to the record cap. Null when nothing is in scope. */
export function generateFactory(c: Ctx, p: FgParams, nowIso: string): Generated | null {
  const grid = fgGrid(c), win = fgPhaseWindows(c, grid);
  if (!Object.keys(win).length) return null;
  const st = fgStructure(c, win, tagMap(c)), m = model(c), D = p.density;
  const d: FactoryData = { ...structuredClone(EMPTY_FACTORY), VISION: { id: 'vision-1', statement: st.vision, updatedAt: nowIso }, PORTFOLIO_ITEMS: st.portfolios, EPICS: st.epics, FEATURES: st.features, STORIES: st.stories };
  const months = engineNow(c).months().map((r) => r.adoptionRampPct), curve: number[] = [];
  for (let k = 1; k <= grid.horizon * 12; k++) curve.push(months[Math.min(months.length - 1, k - 1)] as number);
  const team = c.s.teamIn.length ? c.s.teamIn : [{ grade: 'Engineer', skill: 'Software', loc: 'FR', etp: 0 }];
  const wkCommit = ((m.agentRunsYear ? (m.agentRunsYear[1] as number) : 0) / 52.18) * p.commitsPerAgentRun + (m.yearETP[1] as number) * p.humanCommitsPerDevWeek;
  const wkBuild = p.buildsPerWeek * (1 + p.artefactsPerBuild * 6), relTot = Math.floor(grid.totalW / p.releaseEveryWeeks) * 20;
  const cap = p.maxRecords, intended = (wkCommit + wkBuild) * grid.totalW * D + relTot;
  const vol = intended > cap ? Math.max(0.02, (cap - relTot) / Math.max(1, (wkCommit + wkBuild) * grid.totalW * D)) : 1;
  const g: Gen = { d, cnt: 0, cap, rnd: fgRng(p.seed), p, grid, relN: 0, lastRelease: 0, vol, D };
  const storyByPhase: Record<string, string[]> = {};
  st.stories.forEach((s) => { (storyByPhase[s.phaseId as string] ??= []).push(s.id); });
  for (let w = 1; w <= grid.totalW; w++) {
    const year = Math.min(2, Math.floor((w - 1) / 52.18)), ramp = curve[Math.min(curve.length - 1, Math.max(0, Math.floor(((w - 1) * 12) / 52.18)))] as number;
    const open = Object.keys(win).filter((k) => w >= (win[k] as PhaseWindow).sw && w <= (win[k] as PhaseWindow).ew);
    if ((w - 1) % p.sprintWeeks === 0) d.SPRINTS.push({ id: 'sp-' + d.SPRINTS.length, name: `Sprint ${d.SPRINTS.length + 1}`, startAt: grid.date(w), endAt: grid.date(w + p.sprintWeeks) });
    if ((w - 1) % p.piWeeks === 0) d.PROGRAM_INCREMENTS.push({ id: 'pi-' + d.PROGRAM_INCREMENTS.length, name: `PI-${d.PROGRAM_INCREMENTS.length + 1}`, startAt: grid.date(w), endAt: grid.date(w + p.piWeeks) });
    if (!open.length) continue;
    weekCommits(g, c, m, w, year, ramp, open.flatMap((k) => (win[k] as PhaseWindow).arts), team);
    weekBuilds(g, c, w, year, open);
    runRelease(g, w, open.flatMap((k) => storyByPhase[k] ?? []));
  }
  st.stories.forEach((s) => {
    const wnd = win[s.phaseId as string]; if (!wnd) return;
    const mid = Math.round((wnd.sw + wnd.ew) / 2), sp = d.SPRINTS[Math.min(d.SPRINTS.length - 1, Math.max(0, Math.floor((mid - 1) / p.sprintWeeks)))];
    if (sp) d.STORY_ASSIGNMENTS.push({ id: 'sa-' + d.STORY_ASSIGNMENTS.length, storyId: s.id, sprintId: sp.id, teamId: null });
  });
  d.INTEGRATED_PRODUCT = { id: 'ip-1', name: 'Integrated Product', buildArtifactIds: d.BUILD_ARTIFACTS.slice(-p.artefactsPerBuild).map((x) => x.id) };
  const means = [0, 1, 2].map((y) => { const sl = curve.slice(y * 12, (y + 1) * 12); return sl.length ? Math.round(sl.reduce((t, v) => t + v, 0) / sl.length) : 0; });
  return { data: d, phaseFeatures: st.phaseFeatures, storyOf: st.storyOf, provenance: { at: nowIso, seed: p.seed, weeks: grid.totalW, volScale: +vol.toFixed(3),
    curve: 'monotone monthly through annual breakpoints', curveMeans: means, from: grid.date(1), phases: Object.keys(win).length, ramps: m.ramps.slice(), eff: Math.round(m.eff), ceiling: Math.round(m.ceiling), records: g.cnt, ms: 0 } };
}
