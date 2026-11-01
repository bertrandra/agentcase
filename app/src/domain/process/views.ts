/** @calc-zone process-model */
import type { ArtefactEdit } from '../types/state';
import { byRank } from './order';
import { normKey } from './ids';
import { readProcess } from './read';
import type { ActivityView, ProcessView } from './readTypes';
import { EDIT_FIELDS, type ScopeKeys } from './types';
import { catalogueViews, type CatalogueViews } from './viewsCatalogue';
import type { XDocument } from './xml';

export interface ProcessViews extends CatalogueViews { keys: ScopeKeys }
const byOrder = (a: ActivityView, b: ActivityView): number => a.order - b.order;

/** The edit record of an activity: the listed fields, read from the activity's own parameters. */
function record(a: ActivityView, fields: readonly string[]): ArtefactEdit {
  const vals: Record<string, number | undefined> = { agentSup: a.agent, humanSup: a.human, effort: a.effort, seq: a.seq };
  const r: ArtefactEdit = { id: a.id };
  for (const f of fields) Object.assign(r, { [f]: vals[f] });
  return r;
}
/** The legacy edit list of an activity list: every activity with its four fields when the process says `all`, else the marked ones. */
function editsOf(acts: ActivityView[], all: boolean): ArtefactEdit[] {
  if (all) return acts.map((a) => record(a, EDIT_FIELDS));
  return byRank(acts.filter((a) => a.edited), (a) => a.editRank).map((a) => record(a, a.edited ?? []));
}
/**
 * A case list: the marked elements (by rank when ranked) merged with the entries kept on `ac:process`, by position; elements without a rank
 * (document order) come first, then the kept entries.
 */
function listOf(v: ProcessView, list: string, items: { id: string; rank?: number }[]): string[] {
  const extra = byRank(v.params.unmatched.filter((u) => u.list === list).map((u) => ({ id: u.value, rank: u.rank })), (x) => x.rank);
  if (!items.some((x) => x.rank !== undefined)) return [...items, ...extra].map((x) => x.id);
  return byRank([...items, ...extra], (x) => x.rank).map((x) => x.id);
}
const selectedOf = (v: ProcessView, list: string, acts: ActivityView[]): string[] =>
  listOf(v, list, acts.filter((a) => a.inScope).map((a) => ({ id: a.id, rank: a.rank })));

/** The version 2 scope keys, derived from the document (spec § 6.2). */
function keysOf(v: ProcessView): ScopeKeys {
  const sdlc = v.activities.filter((a) => !a.regulatory).sort(byOrder), reg = v.activities.filter((a) => a.regulatory).sort(byOrder);
  const keys: ScopeKeys = {
    selectedArtefacts: selectedOf(v, 'selectedArtefacts', sdlc), artefactsEdited: editsOf(sdlc, v.params.sdlcEdits === 'all'),
    selectedRegArtefacts: selectedOf(v, 'selectedRegArtefacts', reg), regArtefactsEdited: editsOf(reg, v.params.regEdits === 'all'),
    phaseOff: listOf(v, 'phaseOff', v.phases.filter((p) => p.inScope === false).map((p) => ({ id: p.id, rank: p.rank }))),
    selectedNorms: listOf(v, 'selectedNorms', v.norms.filter((n) => n.inScope).map((n) => ({ id: normKey(n.industry, n.name), rank: n.rank }))),
    regInclude: v.params.regInclude ?? true,
  };
  if (v.params.rampSeq !== 'none') {
    keys.phaseSeq = byRank(v.phases.filter((p) => p.rampSeq !== undefined), (p) => p.rampRank).map((p) => ({ id: p.id, seq: p.rampSeq ?? null }));
  }
  if (v.params.skillMap !== 'none') {
    keys.skillMap = Object.fromEntries(v.actors.filter((r) => r.kind === 'role' && !r.regulatory && r.teamSkill !== undefined)
      .map((r) => [r.name, r.teamSkill as string]));
  }
  return keys;
}

const memo = new WeakMap<XDocument, ProcessViews>();
/**
 * Everything the engine reads today, derived from a process document (spec § 6.2): the version 2 scope keys (`keys`), the artefact lists
 * with the edited values applied, the phases (catalogue and with the case's ramp-up sequences), the norms, the loop pairs and the role →
 * team-skill map. Computed, never stored; memoised on the document's identity.
 */
export function viewsOf(d: XDocument): ProcessViews {
  const hit = memo.get(d);
  if (hit) return hit;
  const v = readProcess(d), out: ProcessViews = { ...catalogueViews(v), keys: keysOf(v) };
  memo.set(d, out);
  return out;
}
