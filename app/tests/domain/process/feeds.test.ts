import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { doraReadout } from '@/domain/model/supView';
import { FEED_KEYS, handoffMonthCost, processFeeds, releasesPerYear } from '@/domain/process/feeds';
import { addWait, cadenceOf, handoffsOf, waitsOf } from '@/domain/process/profile';
import type { CaseState } from '@/domain/types/state';
import { ganttView } from '@/domain/verifyB';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { BPMN_FIXTURES } from '../../helpers/bpmnValidate';
import { loadCase } from '../../helpers/portfolio';
import { opened } from '../../helpers/processCases';

/**
 * SPEC_FIXES FX-D8 (a): the process model feeds the engine, opt-in per factor. Off (the default) nothing moves; on, each factor reads the model:
 * the change-failure rate (DORA row), the hand-off hours (a run cost from the first month with agents), the waits (the delivery Gantt).
 */
const file = parseBpmn(readFileSync(join(BPMN_FIXTURES, 'extended-agentcase.bpmn'), 'utf8')).doc!;
const withModel = (checked: Record<string, boolean> = {}): CaseState => {
  const s = loadCase('golden');
  return { ...s, BPMN: file, dom: { ...s.dom, checked: { ...s.dom.checked, ...checked } } };
};
const all = Object.fromEntries(Object.values(FEED_KEYS).map((k) => [k, true]));

describe('the process model feeds the engine (FX-D8)', () => {
  it('off by default: no factor is read', () => expect(processFeeds(makeCtx(withModel()))).toEqual({}));
  it('on: each factor reads what the model gives', () => {
    const f = processFeeds(makeCtx(withModel(all))), cad = cadenceOf(file.root);
    expect(f.cfr).toBe(0.15);
    expect(f.handoffHours).toBe(handoffsOf(file.root).hours);
    expect(f.cadenceWeeks).toBe(cad ? cad.days / 7 : undefined);
    if (waitsOf(file.root).size) expect(f.waits).toEqual(waitsOf(file.root)); else expect(f.waits).toBeUndefined();
  });
  it('DORA change-failure rate: the escape rate off, the model\'s 15 % on', () => {
    expect(doraReadout(makeCtx(withModel({ [FEED_KEYS.cfr]: true }))).changeFailureRate.derived).toBe(15);
    expect(doraReadout(makeCtx(withModel())).changeFailureRate.unit).toMatch(/escape/);
  });
  it('hand-offs: their monthly cost is added to the run cost of every month with agents, nothing else moves', () => {
    const off = engineNow(makeCtx(withModel())), c = makeCtx(withModel({ [FEED_KEYS.handoff]: true })), on = engineNow(c);
    const f = processFeeds(c), k = on.year(on.horizonYears), k0 = off.year(off.horizonYears);
    expect(f.handoffHours).toBeGreaterThan(0);
    const month = handoffMonthCost(f, on.K.dayRateTarget);
    expect(month).toBeCloseTo((f.handoffHours! * releasesPerYear(f) * on.K.dayRateTarget) / 8 / 12, 9);
    expect(k.totalRunCost - k0.totalRunCost).toBeCloseTo(month * 12, 3);
  });
  it('waits: a phase with waiting days is longer on the Gantt and says so; off, the Gantt is unchanged', () => {
    const s0 = opened('golden'), waited = { ...s0, BPMN: addWait(s0.BPMN, 'V3', 'wait-v3', 'P5D', 'Approval') };
    const json = (s: CaseState) => JSON.stringify(ganttView(makeCtx(s)));
    expect(json(waited)).toBe(json(s0));
    const on = ganttView(makeCtx({ ...waited, dom: { ...waited.dom, checked: { ...waited.dom.checked, [FEED_KEYS.waits]: true } } }));
    const off = ganttView(makeCtx(waited)), p0 = off.phases.find((p) => p.key === 'V3')!, p1 = on.phases.find((p) => p.key === 'V3')!;
    expect(p1.act).toBeGreaterThan(p0.act);
    expect(p1.meta).toContain('5 d waits');
  });
});
