import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { REG_ARTEFACTS, engineNow, makeCtx, type CaseState } from '@/domain';
import { fteAtMonth } from '@/domain/economics/fte';
import { CROSS_CODES, GLOSSARY_TERMS, INDUSTRIES, crossOn, onboardingBand, plannedQuarters, regGlassCeiling, roadmapStages, trackStatus,
  type TrackActual } from '@/domain/frame';

const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort().filter((id) => existsSync(`fixtures/extras/frameQuarters/${id}.json`));
const load = (kind: string, id: string) => JSON.parse(readFileSync(`fixtures/${kind}/${id}.json`, 'utf8'));
const NOW = new Date('2000-01-01');   // before every start date: no stage is "current"

describe('frame domain = legacy oracle (tools/oracle-extras.d/frame.mjs)', () => {
  it('covers every fixture', () => expect(ids.length).toBeGreaterThanOrEqual(50));
  it('industry list and per-industry artefact counts', () => {
    const exp = load('extras/frameIndustries', 'golden');
    expect(INDUSTRIES).toEqual(exp);
    for (const i of INDUSTRIES.filter((x) => x.code !== 'NONE')) expect(REG_ARTEFACTS.filter((a) => a.industry === i.code).length).toBe(i.regArtifacts);
  });
  it.each(ids)('%s', (id) => {
    const state = load('cases', id) as CaseState & { trackActuals?: Record<string, TrackActual> }, c = makeCtx(state);
    const x = (n: string) => load(`extras/${n}`, id);
    expect(GLOSSARY_TERMS).toBe(x('frameGlossaryCount'));
    expect(regGlassCeiling(c)).toBeCloseTo(x('frameRegCeil'), 8);
    const q = plannedQuarters(c);
    // DEV-FTE-ONE-DEF: the planned "FTE freed" is the FTE owner's (entry team - delivery - agentic run team at the month); the legacy was base × adoption.
    const noFreed = (rows: { label: string; ad: number; savPlan: number }[]) => rows.map((r) => ({ label: r.label, ad: r.ad, savPlan: r.savPlan }));
    expect(noFreed(q)).toEqual(noFreed(x('frameQuarters')));
    q.forEach((p, i) => expect(p.freed).toBe(Math.round(fteAtMonth(c, Math.min(engineNow(c).horizonMonths, Math.max(1, i * 3 + 1.5))).freed * 10) / 10));
    const b = onboardingBand(c);
    expect([`${b.totalWeeks} wk`, `${b.months} mo`, b.pilotStart, b.decide]).toEqual(x('frameEngageBand'));
    expect(roadmapStages(c, NOW).map((s) => [s.name, s.label, `${s.from} → ${s.to ?? 'open'}`, `Gate: ${s.gate}`].join('|'))).toEqual(x('frameRoadmap'));
    const st = trackStatus(q, state.trackActuals ?? {});
    expect([st.head, `${st.filled} / ${st.total}`, `${st.latest}%`]).toEqual(x('frameTrackStatus'));
    expect(CROSS_CODES.map((code) => crossOn(state.selectedNorms, code))).toEqual(x('frameCrossOn'));
  });
});
