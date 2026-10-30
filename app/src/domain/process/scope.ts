/** @calc-zone process-model */
import type { ArtefactEdit } from '../types/state';
import { catalogueProcess } from './defaultProcess';
import { applyCase, scopeKeysOf, type LegacyScope } from './fromCase';
import { normKey } from './ids';
import { readProcess } from './read';
import type { ActivityView, ProcessView } from './readTypes';
import type { ScopeKeys } from './types';
import { viewsOf } from './views';
import type { XDocument } from './xml';

/**
 * The version 2 case keys the `BPMN` document owns since schema v3 (spec § 6.1, § 6.2, D-B1): never stored in a case any more, only derived by
 * `scopeOf`. A version 2 file's values of these keys become the document (migration 2 → 3); a legacy reader gets them back from the views.
 */
export const SCOPE_KEYS = ['selectedArtefacts', 'artefactsEdited', 'selectedRegArtefacts', 'regArtefactsEdited', 'phaseOff', 'selectedNorms', 'phaseSeq',
  'regInclude', 'skillMap'] as const;
export type ScopeKey = (typeof SCOPE_KEYS)[number];
/** The key of the case's process document (D-B1: XML text in files, its node tree in the store). */
export const BPMN_KEY = 'BPMN';

const legacy = new WeakMap<object, ScopeKeys>();
/**
 * THE ACCESSOR of the scope (spec § 6.2): the version 2 keys the engine reads, derived from the case's process document. Same shapes and values
 * as the keys a version 2 case stored; computed, never stored; memoised on the document's identity (one read per edit).
 * An object without a document is a version 2 case handed to the engine as it is (a fixture file, a tool's input; never a case of the store, which
 * always holds its document): its own keys are read, as the engine read them before schema v3.
 */
export function scopeOf(s: { BPMN?: XDocument }): ScopeKeys {
  const d = s.BPMN as unknown;
  if (d && typeof d === 'object') return viewsOf(d as XDocument).keys;
  if (d !== undefined) throw new Error('scopeOf: the process document is still XML text (open the case through the snapshot reader first)');
  let k = legacy.get(s);
  if (!k) { k = scopeKeysOf(s as LegacyScope); legacy.set(s, k); }
  return k;
}

type Values = { agent: number; human: number; effort: number; seq?: number };
const catalogueValues = new WeakMap<XDocument, Map<string, Values>>();
/** The catalogue parameters of each activity (what a missing legacy edit record means: applyEdits fell back to the catalogue). */
function catalogueOf(): Map<string, Values> {
  const base = catalogueProcess();
  let m = catalogueValues.get(base);
  if (!m) { m = new Map(readProcess(base).activities.map((a) => [a.id, a])); catalogueValues.set(base, m); }
  return m;
}

/** Known entries once each, in document order, then the other entries (unknown ids, repeats) in their own order. */
function ordered(list: readonly string[], natural: readonly string[]): string[] {
  const known = new Set(natural), seen = new Set<string>(), extras: string[] = [];
  for (const id of list) { if (known.has(id) && !seen.has(id)) seen.add(id); else extras.push(id); }
  return [...natural.filter((id) => seen.has(id)), ...extras];
}
const pick = (v: unknown, base: number | undefined): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : base);
/** The full edit list: every activity with its four values, from its record (the last one, like applyEdits) or the catalogue. */
function fullEdits(acts: ActivityView[], edits: readonly ArtefactEdit[]): ArtefactEdit[] {
  const recs = new Map(edits.map((r) => [r.id, r])), cat = catalogueOf();
  return acts.map((a) => {
    const r = recs.get(a.id), b: Values = cat.get(a.id) ?? a;
    return { id: a.id, agentSup: pick(r?.agentSup, b.agent), humanSup: pick(r?.humanSup, b.human), effort: pick(r?.effort, b.effort),
      seq: pick(r?.seq, b.seq) };
  });
}

/**
 * The normal form of a set of scope keys on a document (decided in phase B3, spec § 6.3): the selections, the phases switched off and the ramp-up
 * sequences in document order (the order of these lists never changed a figure: every reader treats them as sets or maps), entries no element
 * carries (unknown ids, repeats) after them, and the edit lists complete (every activity, four values: the shape every saved case holds).
 */
export function normalKeys(v: ProcessView, k: ScopeKeys): ScopeKeys {
  const byOrder = (a: ActivityView, b: ActivityView): number => a.order - b.order;
  const sdlc = v.activities.filter((a) => !a.regulatory).sort(byOrder), reg = v.activities.filter((a) => a.regulatory).sort(byOrder);
  const phaseIds = v.phases.map((p) => p.id), out: ScopeKeys = {
    selectedArtefacts: ordered(k.selectedArtefacts, sdlc.map((a) => a.id)), artefactsEdited: fullEdits(sdlc, k.artefactsEdited),
    selectedRegArtefacts: ordered(k.selectedRegArtefacts, reg.map((a) => a.id)), regArtefactsEdited: fullEdits(reg, k.regArtefactsEdited),
    phaseOff: ordered(k.phaseOff, phaseIds), selectedNorms: ordered(k.selectedNorms, v.norms.map((n) => normKey(n.industry, n.name))),
    regInclude: !!k.regInclude,
  };
  if (k.phaseSeq) {
    const seq = new Map(k.phaseSeq.map((e) => [e.id, e.seq]));
    out.phaseSeq = phaseIds.filter((id) => seq.has(id)).map((id) => ({ id, seq: seq.get(id) ?? null }));
  }
  if (k.skillMap) out.skillMap = k.skillMap;
  return out;
}

/**
 * The document with these scope keys (spec § 9: the legacy scope commands are written through it): `ac:inScope` of activities, phases and
 * norms, the edited parameters on the activities themselves, ramp-up sequences, regulatory inclusion and the skill map, in the normal form.
 * Unchanged elements keep their identity, so the store's diff of the two trees is a few attribute patches.
 */
export const withScope = (d: XDocument, keys: ScopeKeys): XDocument => applyCase(d, normalKeys(readProcess(d), keys));

/** A copy of the keys a command may change in place (lists, records and the skill map copied; the document is untouched). */
export function editableKeys(k: ScopeKeys): ScopeKeys {
  const out: ScopeKeys = {
    selectedArtefacts: [...k.selectedArtefacts], artefactsEdited: k.artefactsEdited.map((r) => ({ ...r })), selectedRegArtefacts: [...k.selectedRegArtefacts],
    regArtefactsEdited: k.regArtefactsEdited.map((r) => ({ ...r })), phaseOff: [...k.phaseOff], selectedNorms: [...k.selectedNorms], regInclude: k.regInclude,
  };
  if (k.phaseSeq) out.phaseSeq = k.phaseSeq.map((e) => ({ ...e }));
  if (k.skillMap) out.skillMap = { ...k.skillMap };
  return out;
}

const caseDocs = new Map<string, XDocument>();
/** The process document of a version 2 case's keys on the catalogue process, normalised (the migration 2 → 3; memoised on the keys' JSON). */
export function caseProcess(keys: ScopeKeys): XDocument {
  const id = JSON.stringify(keys), hit = caseDocs.get(id);
  if (hit) return hit;
  const d = withScope(catalogueProcess(), keys);
  if (caseDocs.size > 64) caseDocs.clear();
  caseDocs.set(id, d);
  return d;
}
