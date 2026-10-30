/** @calc-zone process-model */
import type { Phase } from '../types/catalog';
import type { ActivityView, PhaseView, ProcessView } from './readTypes';
import { mergeRework } from './readRework';
import type { CatArtefact, CatLoopPair, CatPhase, Norm } from './types';

/** The catalogue-shaped views of a process document: the same objects the engine reads from the JSON catalogues today. */
export interface CatalogueViews {
  /** SDLC / regulatory artefacts with the case's edited values (legacy applyEdits(SDLC_ARTEFACTS / REG_ARTEFACTS, edits)) */
  sdlc: CatArtefact[]; reg: CatArtefact[];
  /** catalogue phases (PHASES), the same with the case's ramp-up sequences applied (phasesWithSeq), the Cross-cutting bucket */
  phases: CatPhase[]; phasesWithSeq: CatPhase[]; crossCutting: Phase | undefined;
  norms: Norm[]; loopPairs: CatLoopPair[];
}

const byOrder = (a: { order?: number }, b: { order?: number }): number => (a.order ?? 0) - (b.order ?? 0);
const defined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

function artefactOf(a: ActivityView, names: Map<string, string>, norms: Map<string, { industry: string; name: string }>): CatArtefact {
  // B5b: the effort counts `factor` times (volume, frequency, compensation, D-B21); a script task is already automated: no AI saving (D-B23)
  const common = {
    id: a.id, name: a.name, phase: a.phase, value: a.value, aiAuth: a.aiAuthority, humanSup: a.human, agentSup: a.type === 'Script' ? 0 : a.agent,
    effort: a.factor === undefined ? a.effort : a.effort * a.factor,
    _agent0: a.agent0, w: a.weight, seq: a.seq, capability: a.capability, agentActivityType: a.type, storyId: a.storyId,
  };
  const role = names.get(a.humanPerformer ?? '') ?? '';
  if (!a.regulatory) return defined({ ...common, skill: role, deliverable: a.deliverable ?? '' });
  const n = norms.get(a.norm ?? '');
  // a regulatory artefact has no deliverable field (the JSON catalogue's shape, which the Artefact type does not model)
  return defined({ ...common, industry: n?.industry, norm: n?.name, skill: n?.name ?? '', purpose: a.documentation, isReg: true, teamSkill: role,
    deliverable: undefined as unknown as string });
}

const phaseOf = (p: PhaseView): CatPhase => {
  const out: CatPhase = { id: p.id, name: p.name, sdlc: p.sdlc, reg: p.reg, role: p.role, seq: p.seq };
  if (p.featureIds) out.featureIds = p.featureIds;
  return out;
};

export function catalogueViews(v: ProcessView): CatalogueViews {
  const names = new Map(v.actors.map((r) => [r.id, r.name])), norms = new Map(v.norms.map((n) => [n.id, n]));
  const acts = (reg: boolean) => v.activities.filter((a) => a.regulatory === reg).sort(byOrder).map((a) => artefactOf(a, names, norms));
  const main = v.phases.filter((p) => !p.adHoc).sort(byOrder), cross = v.phases.find((p) => p.adHoc);
  const phases = main.map(phaseOf);
  return {
    sdlc: acts(false), reg: acts(true), phases,
    phasesWithSeq: main.map((p, i) => (typeof p.rampSeq === 'number' ? { ...(phases[i] as CatPhase), seq: p.rampSeq } : phases[i] as CatPhase)),
    crossCutting: cross ? phaseOf(cross) : undefined,
    norms: v.norms.map((n) => defined({ industry: n.industry, name: n.name, count: n.count, body: n.body, scope: n.scope })),
    loopPairs: mergeRework(v.flows.filter((f) => f.rework).sort((a, b) => byOrder(a.rework ?? {}, b.rework ?? {})).map((f) => {
      const r = f.rework as NonNullable<typeof f.rework>;
      return defined({ id: f.id, label: f.name ?? '', artA: r.activityA, artB: r.activityB, internalIter: r.internalIterations, internalNote: r.note,
        extReworkPct: r.probability, extFrom: r.external ? f.source : null, extTo: r.external ? f.target : null, extCostShare: r.costShare });
    }), v.reworks, v.phases, v.activities),
  };
}
