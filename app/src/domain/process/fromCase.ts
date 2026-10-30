/** @calc-zone process-model */
import type { CaseState } from '../types/state';
import { roleResource } from './buildActors';
import { casePlan, type CasePlan, type ElementPatch } from './casePlan';
import { catalogueProcess, mapElements } from './defaultProcess';
import { readProcess } from './read';
import type { ScopeKeys } from './types';
import { attr, el, kid, NS, text, withAttrs, withChildren, type AttrInput, type XDocument, type XElement, type XNode } from './xml';
import { indent } from './xmlWrite';

/** The version 2 scope keys of a case (`skillMap` is untyped on CaseState). */
export function scopeKeysOf(s: CaseState): ScopeKeys {
  const k: ScopeKeys = {
    selectedArtefacts: s.selectedArtefacts ?? [], artefactsEdited: s.artefactsEdited ?? [], selectedRegArtefacts: s.selectedRegArtefacts ?? [],
    regArtefactsEdited: s.regArtefactsEdited ?? [], phaseOff: s.phaseOff ?? [], selectedNorms: s.selectedNorms ?? [], regInclude: !!s.regInclude,
  };
  const m = (s as unknown as { skillMap?: Record<string, string> }).skillMap;
  if (s.phaseSeq) k.phaseSeq = s.phaseSeq;
  if (m && typeof m === 'object') k.skillMap = m;
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
 * The case's process document (spec § 3, § 6.1): the catalogue process with the case's scope (selected activities, phases switched off,
 * ramp-up sequences, norms, regulatory inclusion), its edited activity parameters and its skill map. Phase B1: the case still stores the
 * version 2 keys; this is the document migration 2 → 3 will write (B3). `viewsOf(processFromCase(c))` gives the keys back exactly.
 */
export function processFromCase(s: CaseState, base: XDocument = catalogueProcess()): XDocument {
  const keys = scopeKeysOf(s), plan = casePlan(readProcess(base), keys);
  const root = mapElements(base.root, (e) => {
    const id = attr(e, 'id'), p = id === undefined ? undefined : plan.patches.get(id);
    if (p) return apply(e, p);
    return e.ns === NS.ac && e.local === 'process' ? caseParams(e, plan) : e;
  });
  return { ...base, root: withSkillMap(root, keys.skillMap) };
}
