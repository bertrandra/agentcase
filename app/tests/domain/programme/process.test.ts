import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { engineNow } from '@/domain/canonical';
import { TRANSITIONS } from '@/domain/tune/program';
import { resolveProduct } from '@/domain/portfolio';
import { exportCaseText, exportDocument, serialize } from '@/domain/process';
import { PROGRAMME_ACTIVITIES, PROGRAMME_LANES, programmeDrawing, programmeProcess } from '@/domain/programme';
import { programmeDocument, withoutProgramme, withProgramme } from '@/domain/programme/bpmn';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { schemaTestsRun, validateText } from '../../helpers/bpmnValidate';
import { opened } from '../../helpers/processCases';
import { openPortfolioFixture } from '../../helpers/portfolioFixtures';

/** SPEC_BPMN § 19.4 F-B64, F-B66, F-B67, F-B69 (phase B9a): the programme process derived from the case, its diagram and its BPMN export. */
const golden = opened('golden'), c = makeCtx(golden);

describe('programme process (derived)', () => {
  const v = programmeProcess(c);
  it('a participant "Transformation programme" with a lane per operating-model role and the agents in their own lane', () => {
    expect(v.participant.name).toBe('Transformation programme');
    expect(v.lanes.map((l) => l.name)).toEqual(['AI Office lead', 'Design Authority', 'Orchestrator', 'AI reviewer', 'Preceptor', 'Agent architect', 'FinOps',
      'AI agents']);
    expect(v.lanes.filter((l) => l.fteY1 !== null).every((l) => (l.fteY1 as number) >= 0)).toBe(true);
    expect(v.lanes.find((l) => l.role === 'agents')!.fteY1).toBeNull();
  });
  it('every activity of the inventory, in a lane and a phase, with its description, RACI, cost rule, placement and parameter values from the keys', () => {
    expect(v.activities.map((a) => a.kind)).toEqual(PROGRAMME_ACTIVITIES.map((a) => a.kind));
    for (const a of v.activities) {
      expect(PROGRAMME_LANES.some((l) => l.role === a.lane), a.id).toBe(true);
      expect(a.description.length, a.id).toBeGreaterThan(10);
      expect(a.placement.text.length, a.id).toBeGreaterThan(5);
      for (const p of a.values) if (p.def.store !== 'knowledge') expect(p.value).toBe(c.inp.v(p.def.key));
    }
    expect(v.activities.find((a) => a.kind === 'stage-discover')!.values[0]!.def.key).toBe('rmD1');
    expect(v.activities.filter((a) => a.level === 'product').every((a) => a.instances === 1)).toBe(true);
  });
  it('message flows to the delivery process (F-B66)', () => {
    expect(v.messageFlows.map((f) => f.name)).toContain('Pilot decision → scale');
    expect(v.messageFlows.every((f) => f.target === v.deliveryParticipant)).toBe(true);
  });
  it('the drawing puts every activity in its lane and phase, and draws the message flows out of the pool', () => {
    const d = programmeDrawing(v), at = new Map(d.shapes.map((s) => [s.id, s]));
    for (const a of v.activities) {
      const s = at.get(a.id)!, lane = at.get(`prog-lane-${a.lane}`)!, ph = at.get(`prog-phase-${a.phase}`)!;
      expect(s.y >= lane.y && s.y + s.h <= lane.y + lane.h, a.id).toBe(true);
      expect(s.x >= ph.x && s.x + s.w <= ph.x + ph.w, a.id).toBe(true);
    }
    expect(d.edges.filter((e) => e.message).length).toBe(v.messageFlows.length);
  });
});

describe('programme milestones and gateways (§ 19.2 rows of 2026-10-30)', () => {
  const v = programmeProcess(c), ms = engineNow(c).milestones();
  it('the maturity gates are placed at the engine\'s crossings, the governance gates at its first adoption crossing; no cost, per product', () => {
    for (const lv of ['L2', 'L3', 'L4']) {
      const g = v.milestones.find((m) => m.kind === `gate-${lv}`)!;
      expect([g.element, g.month]).toEqual(['gateway', ms.find((m) => m.family === 'maturity' && m.level === lv)?.month ?? null]);
      expect(g.criteria).toBe(TRANSITIONS.find(([t]) => t.endsWith(lv))![1]);
    }
    expect(v.milestones.find((m) => m.kind === 'govGates')!.month).toBe(ms.find((m) => m.family === 'adoption')?.month ?? null);
    expect(v.milestones.every((m) => m.instances === 1)).toBe(true);
  });
  it('capability building is part of the training activity, with the milestone "Target capability reached"', () => {
    expect(v.activities.find((a) => a.kind === 'setupTraining')!.values.map((p) => p.def.key))
      .toEqual(['trainFte', 'trainMonths', 'capOps', 'capTrain', 'capTarget']);
    expect(v.milestones.find((m) => m.kind === 'capabilityTarget')!.month).toBeNull();
  });
  it('the export writes them as an exclusive gateway and intermediate events with their criteria', () => {
    const t = serialize(programmeDocument(v));
    expect(t).toContain('<bpmn:exclusiveGateway id="prog-gate-L2" name="Maturity gate L1 → L2">');
    expect(t).toContain('<bpmn:intermediateThrowEvent id="prog-capabilityTarget" name="Target capability reached">');
  });
});

describe('programme process in a portfolio (F-B67)', () => {
  const pf = openPortfolioFixture(), id = pf.products[0]!.id, v = programmeProcess(makeCtx(resolveProduct(pf, id)), pf, id);
  it('waves are sub-processes with their products; per-product activities are multi-instance over the planned products', () => {
    expect(v.waves.length).toBe(pf.waves.length);
    expect(v.waves.flatMap((w) => w.products).length).toBe(pf.products.filter((p) => !p.archived && p.waveId !== null).length);
    expect(v.activities.find((a) => a.kind === 'pilot')!.instances).toBe(pf.products.filter((p) => !p.archived && p.waveId !== null).length);
    expect(v.activities.find((a) => a.kind === 'ktPrep')!.values[0]!.value).toBe(String(pf.products[0]!.knowledge.ktLeadMonths ?? 0));
  });
});

describe('programme export (F-B69)', () => {
  const v = programmeProcess(c), delivery = exportDocument(golden), both = withProgramme(delivery, v);
  it('delivery only is unchanged; both adds the participant, process, message flows and DI; the import reads the delivery part only', () => {
    expect(serialize(delivery)).toBe(exportCaseText(golden));
    const text = serialize(both);
    expect(text).toContain('ac:programme="true"');
    expect(text).toContain('<bpmn:messageFlow id="prog-mf-scale"');
    const read = parseBpmn(text).doc!;
    expect(serialize(withoutProgramme(read))).toBe(serialize(delivery));
  });
  it.skipIf(!schemaTestsRun())('both and programme-only validate (OMG XSDs + ac: + profile)', () => {
    for (const [name, d] of [['both.bpmn', both], ['programme.bpmn', programmeDocument(v)]] as const) {
      const r = validateText(serialize(d), name);
      expect({ schema: r?.schema, errors: r?.errors }, name).toEqual({ schema: 'valid', errors: [] });
    }
  }, 60000);
});
