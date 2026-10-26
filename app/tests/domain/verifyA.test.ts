import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model } from '@/domain';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { agentDirectory, loopInternalTokenCost, maturityInfo, rolesForPhase, skillGradeRate, targetTeam, teamSkillList, tobeComposition, tobeSkillLocDefault, tokenUsage, locBlendedTJM } from '@/domain/verifyA';
import { targetBlendedTJM } from '@/domain/location';
import { loopExternalReworkEffort } from '@/domain/model/loops';
import { diffs, extra } from '../helpers/economics';
import { VFA_FIXTURES } from '../helpers/verifyA';
import { withoutDeviations } from '../helpers/deviations';

const live = (id: string) => { const c = makeCtx(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')))); return { c, m: model(c), eng: engineNow(c) }; };
const pick = <T extends object>(o: T, keys: string[]) => Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown>)[k]]));

describe('verify (first half) domain reproduces the legacy', () => {
  it('has the fixtures', () => expect(VFA_FIXTURES.length).toBeGreaterThanOrEqual(60));
  it.each(VFA_FIXTURES)('%s: TO-BE composition, location default and grade rates', (id) => {
    const l = live(id), e = extra<{ rows: unknown; tot: Record<string, number>; years: number[]; skills: string[]; def: unknown; rate: unknown }>('vfa_tobe', id), comp = tobeComposition(l, 2);
    expect(diffs(e.rows, comp.rows)).toEqual([]);
    expect(diffs(pick(e.tot, ['asis', 'sumAsis', 'human', 'agent']), comp.tot)).toEqual([]);
    expect(diffs(e.years, comp.years)).toEqual([]);
    expect(teamSkillList(l.c.s)).toEqual(e.skills);
    expect(diffs(e.def, tobeSkillLocDefault(l.c.s))).toEqual([]);
    expect(diffs(e.rate, e.skills.map((s) => [s, skillGradeRate(l.c.s, s, 'India'), skillGradeRate(l.c.s, s, 'France')]))).toEqual([]);
  });
  it.each(VFA_FIXTURES)('%s: target team, location rates, maturity level', (id) => {
    const l = live(id), t = targetTeam(l);
    // DEV-TEAM-RUN-END: past a 3-year horizon the run team is the horizon end year's (the legacy read year 3), and the total is the FTE owner's after.
    expect(withoutDeviations(diffs(extra('vfa_target', id), { ...t, tjm: locBlendedTJM(l, 'India'), tgt: targetBlendedTJM(l.c.s) }, 'vfa_target'), id)).toEqual([]);
    const end = l.eng.year(l.eng.horizonYears);
    expect([t.runETP, t.totalRecurrent]).toEqual([end.runTeamFteEnd, end.totalHumanFteEnd]);
    expect(diffs(extra('vfa_maturity', id), maturityInfo(l))).toEqual([]);
  });
  it.each(VFA_FIXTURES)('%s: agent directory, roles, loops and token usage', (id) => {
    const l = live(id), e = extra<{ internal: unknown; external: Record<string, unknown>[]; dir: string[]; dirV3: string[]; roles: string[]; rolesV4: string[] }>('vfa_loops', id);
    expect(agentDirectory(l.c, 'ALL').map((a) => a.agent.id)).toEqual(e.dir);
    expect(agentDirectory(l.c, 'V3').map((a) => a.agent.id)).toEqual(e.dirV3);
    expect([rolesForPhase(l.c, 'ALL'), rolesForPhase(l.c, 'V4')]).toEqual([e.roles, e.rolesV4]);
    expect(diffs(e.internal, loopInternalTokenCost(l.c))).toEqual([]);
    expect(diffs(e.external.map((x) => pick(x, ['id', 'rawAddedW', 'rate', 'applied'])), loopExternalReworkEffort(l.c))).toEqual([]);
    const u = tokenUsage(l), x = extra<Record<string, unknown>>('vfa_usage', id);
    expect(diffs(x, { totM: u.totM, y3: u.y3, inputM: u.inputM, outputM: u.outputM, runs: u.agentRuns, tpa: u.tpa, endL: u.endLabel })).toEqual([]);
  });
});
