/** @calc-zone process-model */
import type { ArtefactEdit } from '../types/state';
import { placeList, ranksOf, type Placed } from './order';
import { normKey } from './ids';
import type { ActivityView, ProcessView, Unmatched } from './readTypes';
import { EDIT_FIELDS, type ScopeKeys } from './types';
import type { AttrInput } from './xml';

/** What the case changes on one element: its `ac:inScope`, and attributes of its `ac:<local>` extension elements (activity, phase, norm…). */
export interface ElementPatch { own: AttrInput; ext: Record<string, AttrInput> }
export interface CasePlan { patches: Map<string, ElementPatch>; process: AttrInput; unmatched: Unmatched[] }
const extrasOf = (list: string, xs: { rank: number; value: string }[]): Unmatched[] => xs.map((x) => ({ list, ...x }));

const byOrder = (a: ActivityView, b: ActivityView): number => a.order - b.order;
const full = (r: ArtefactEdit): boolean =>
  Object.keys(r).length === EDIT_FIELDS.length + 1 && EDIT_FIELDS.every((f) => typeof r[f] === 'number');
/** The legacy edit list is "every activity, in order, with all four fields": written once on the process instead of on each activity. */
const isFullList = (recs: ArtefactEdit[], acts: ActivityView[]): boolean =>
  recs.length === acts.length && recs.every((r, i) => r.id === acts[i]?.id && full(r));

/** Scope and edits of one activity list (SDLC or regulatory): selection, its order, the edit records, their fields and order. */
type ListPlan = { all: boolean; extras: Placed['extras'] };
function planList(acts: ActivityView[], selected: string[], edits: ArtefactEdit[], out: Map<string, ElementPatch>): ListPlan {
  const ids = acts.map((a) => a.id), sel = new Set(selected), placed = placeList(selected, ids), rank = placed.ranks, all = isFullList(edits, acts);
  const recs = new Map(edits.map((r) => [r.id, r])), editRank = all ? null : ranksOf(edits.map((r) => r.id).filter((id) => ids.includes(id)), ids);
  for (const a of acts) {
    const r = recs.get(a.id), v = (f: (typeof EDIT_FIELDS)[number], base: number | undefined) => (r?.[f] ?? base);
    const fields = r ? EDIT_FIELDS.filter((f) => f in r && r[f] !== undefined) : [];
    out.set(a.id, {
      own: { 'ac:inScope': sel.has(a.id) },
      ext: {
        activity: { effort: v('effort', a.effort), seq: v('seq', a.seq), scopeRank: rank?.get(a.id), edited: all || !r ? null : fields.join(' '),
          editRank: editRank?.get(a.id) },
        supervision: { human: v('humanSup', a.human), agent: v('agentSup', a.agent) },
      },
    });
  }
  return { all, extras: placed.extras };
}

/**
 * The plan that turns the catalogue process into the case's process (spec § 3): `ac:inScope` on activities, phases and norms, list positions
 * in their `ac:` elements, the edited parameters on the activities, the case parameters on `ac:process`. Positions are written only when a case list is not
 * in document order, so a list in catalogue order costs nothing.
 */
export function casePlan(v: ProcessView, k: ScopeKeys): CasePlan {
  const patches = new Map<string, ElementPatch>();
  const sdlc = v.activities.filter((a) => !a.regulatory).sort(byOrder), reg = v.activities.filter((a) => a.regulatory).sort(byOrder);
  const sdlcList = planList(sdlc, k.selectedArtefacts, k.artefactsEdited, patches);
  const regList = planList(reg, k.selectedRegArtefacts, k.regArtefactsEdited, patches);
  const phaseIds = v.phases.map((p) => p.id), off = new Set(k.phaseOff), offPlaced = placeList(k.phaseOff, phaseIds), offRank = offPlaced.ranks;
  const ramp = new Map((k.phaseSeq ?? []).map((e) => [e.id, e.seq])), rampRank = ranksOf((k.phaseSeq ?? []).map((e) => e.id), phaseIds);
  for (const p of v.phases) {
    const r = ramp.get(p.id);
    patches.set(p.id, { own: { 'ac:inScope': !off.has(p.id) },
      ext: { phase: { offRank: offRank?.get(p.id), rampSeq: ramp.has(p.id) ? (r ?? '') : null, rampRank: rampRank?.get(p.id) } } });
  }
  const keyOf = new Map(v.norms.map((n) => [normKey(n.industry, n.name), n.id])), norms = new Set(k.selectedNorms);
  const normPlaced = placeList(k.selectedNorms, [...keyOf.keys()]), normRank = normPlaced.ranks;
  for (const [key, id] of keyOf) patches.set(id, { own: { 'ac:inScope': norms.has(key) }, ext: { norm: { scopeRank: normRank?.get(key) } } });
  return {
    patches,
    process: { regInclude: k.regInclude, sdlcEdits: sdlcList.all ? 'all' : null, regEdits: regList.all ? 'all' : null,
      rampSeq: k.phaseSeq ? null : 'none', skillMap: k.skillMap ? null : 'none' },
    unmatched: [...extrasOf('selectedArtefacts', sdlcList.extras), ...extrasOf('selectedRegArtefacts', regList.extras),
      ...extrasOf('phaseOff', offPlaced.extras), ...extrasOf('selectedNorms', normPlaced.extras)],
  };
}
