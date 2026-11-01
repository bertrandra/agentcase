/** @calc-zone process-model */
import { roleResource } from './buildActors';
import { casePlan, type CasePlan, type ElementPatch } from './casePlan';
import { catalogueProcess } from './defaultProcess';
import { mapElements } from './order';
import { readProcess } from './read';
import type { ScopeKeys } from './types';
import { attr, el, kid, NS, text, withAttrs, withChildren, type AttrInput, type XDocument, type XElement, type XNode } from './xml';
import { indent } from './xmlWrite';

/** A version 2 case (or any object): the scope keys it may hold, untyped. */
export type LegacyScope = { [K in keyof ScopeKeys]?: unknown };
const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
/** The version 2 scope keys of a case file (absent or damaged lists read as empty, as the engine read them). */
export function scopeKeysOf(o: object): ScopeKeys {
  const s = o as LegacyScope;
  const k: ScopeKeys = {
    selectedArtefacts: list(s.selectedArtefacts), artefactsEdited: list(s.artefactsEdited), selectedRegArtefacts: list(s.selectedRegArtefacts),
    regArtefactsEdited: list(s.regArtefactsEdited), phaseOff: list(s.phaseOff), selectedNorms: list(s.selectedNorms), regInclude: !!s.regInclude,
  };
  const m = s.skillMap;
  if (Array.isArray(s.phaseSeq)) k.phaseSeq = s.phaseSeq as ScopeKeys['phaseSeq'];
  if (m && typeof m === 'object' && !Array.isArray(m)) k.skillMap = m as Record<string, string>;
  return k;
}

/** Sets attributes on the `ac:<local>` children of an element's `extensionElements`. */
function patchExt(e: XElement, patches: Record<string, AttrInput | undefined>): XElement {
  return withChildren(e, e.children.map((x) => (x.kind === 'element' && x.ns === NS.bpmn && x.local === 'extensionElements'
    ? withChildren(x, x.children.map((c) => { const p = c.kind === 'element' && c.ns === NS.ac ? patches[c.local] : undefined;
      return p && c.kind === 'element' ? withAttrs(c, p) : c; }))
    : x)));
}
/** `ac:process` with the case parameters and the list entries no element carries (depth 3: definitions > process > extensionElements). */
function caseParams(e: XElement, plan: CasePlan): XElement {
  const entries = plan.unmatched.map((u) => el('ac:unmatched', { list: u.list, rank: u.rank, value: u.value }));
  return indent(withChildren(withAttrs(e, plan.process), entries), '  ', 3);
}
const apply = (e: XElement, p: ElementPatch): XElement => patchExt(withAttrs(e, p.own), p.ext);

/** The role resources follow the case's skill map: mapped roles carry its team skill, new skills become new roles. */
function withSkillMap(defs: XElement, map: Record<string, string> | undefined): XElement {
  if (!map) return defs;
  const seen = new Set<string>();
  let last = -1;
  const children: XNode[] = defs.children.map((c, i) => {
    if (c.kind !== 'element' || c.ns !== NS.bpmn || c.local !== 'resource') return c;
    last = i;
    const x = kid(kid(c, NS.bpmn, 'extensionElements') ?? c, NS.ac, 'actor');
    if (!x || attr(x, 'kind') !== 'role' || attr(x, 'regulatory') === 'true') return c;
    const name = attr(c, 'name') ?? '';
    seen.add(name);
    return patchExt(c, { actor: { teamSkill: map[name] ?? null } });
  });
  const added = Object.keys(map).filter((s) => !seen.has(s)).flatMap((s) => [text('\n  '), indent(roleResource(s, map[s]), '  ', 1)]);
  children.splice(last + 1, 0, ...added);
  return withChildren(defs, children);
}

/**
 * The process document of a version 2 case (spec § 3, § 6.1): the catalogue process with the case's scope (selected activities, phases switched
 * off, ramp-up sequences, norms, regulatory inclusion), its edited activity parameters and its skill map, every list exactly as the file holds it
 * (`viewsOf(processFromCase(c)).keys` gives the keys back exactly). The migration 2 → 3 writes the normalised form (`withScope`, scope.ts).
 */
export const processFromCase = (s: object, base: XDocument = catalogueProcess()): XDocument => applyCase(base, scopeKeysOf(s));

/** The document with these scope keys written on it (`processFromCase`; `withScope` in scope.ts writes them normalised). */
export function applyCase(base: XDocument, keys: ScopeKeys): XDocument {
  const plan = casePlan(readProcess(base), keys);
  const root = mapElements(base.root, (e) => {
    const id = attr(e, 'id'), p = id === undefined ? undefined : plan.patches.get(id);
    if (p) return apply(e, p);
    return e.ns === NS.ac && e.local === 'process' ? caseParams(e, plan) : e;
  });
  return { ...base, root: withSkillMap(root, keys.skillMap) };
}
