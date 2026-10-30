/** @calc-zone process-model */
import type { CaseState } from '../types/state';
import { BPSIM_DECL, bpsimRelationship, elementParameters, isOwnBpsim, type BpsimValues } from './bpsim';
import { partialOf, withProduct, without } from './partial';
import { readProcess } from './read';
import { boundaryBpsim } from './profile/bpsimBoundary';
import { withHeader } from './profile/header';
import { APP_VERSION } from '../version';
import { attr, NS, text, withAttrs, withChildren, type XDocument, type XElement } from './xml';
import { indent, serialize } from './xmlWrite';

/** Export options (spec § 4.1): in-scope activities only (F-B3), the BPSim encoding (D-B5, on by default), the product of a portfolio. */
export interface ExportOptions { partial?: boolean; bpsim?: boolean; product?: { code: string; name: string } }

/** FTE per team skill of a case's team (`teamIn` rows). */
function fteBySkill(c: CaseState): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of c.teamIn ?? []) m.set(r.skill, (m.get(r.skill) ?? 0) + (Number(r.etp) || 0));
  return m;
}
const round = (n: number): number => Math.round(n * 1e6) / 1e6;

/** The BPSim element parameters of a single-process document: effort of each activity, probability of each rework flow, FTE of each role. */
export function bpsimParams(d: XDocument, c: CaseState): XElement[] {
  const v = readProcess(d), fte = fteBySkill(c), out: [string, BpsimValues][] = [];
  for (const a of v.activities) out.push([a.id, { time: a.effort }]);
  for (const f of v.flows) if (f.rework) out.push([f.id, { probability: f.rework.probability }]);
  out.push(...boundaryBpsim(d));   // B5b: the flow of each error boundary rework path
  for (const r of v.actors) {
    const q = r.kind === 'role' && r.teamSkill !== undefined ? fte.get(r.teamSkill) : undefined;
    if (q) out.push([r.id, { quantity: round(q) }]);
  }
  return out.map(([id, x]) => elementParameters(id, x));
}

/** The document with its AgentCase BPSim scenario (replacing the one a previous export wrote; any other BPSim data is kept). */
export function withBpsim(root: XElement, params: XElement[]): XElement {
  const processes = root.children.filter((e): e is XElement => e.kind === 'element' && e.ns === NS.bpmn && e.local === 'process')
    .map((e) => attr(e, 'id') ?? '');
  const kept = without(root.children, isOwnBpsim), tail = kept[kept.length - 1], rel = indent(bpsimRelationship(params, processes), '  ', 1);
  // indented like the rest of the document: before the white space that closes the definitions
  const children = tail?.kind === 'text' && !tail.text.trim() ? [...kept.slice(0, -1), text('\n  '), rel, tail] : [...kept, rel];
  return withAttrs(withChildren(root, children), BPSIM_DECL);
}

/** The process document of a product inside a portfolio file: product header and in-scope filter applied, no BPSim yet. */
export function productDocument(c: CaseState, opts: ExportOptions): XDocument {
  const d = c.BPMN;
  let root = d.root;
  if (opts.product) root = withProduct(root, opts.product.code, opts.product.name);
  if (opts.partial) root = partialOf(root);
  return { ...d, root };
}

/**
 * The `.bpmn` document of a case (spec § 4.1, F-B1–F-B4): the case's process (its `BPMN` document), every activity with its scope (or only the
 * in-scope ones, `partial`), its diagram, and the BPSim scenario derived from the `ac:` values. Deterministic: same case, same options, same
 * tree (no clock, stable ids and order). The file header of F-B61 is written (B5b).
 */
export function exportDocument(c: CaseState, opts: ExportOptions = {}): XDocument {
  const d = productDocument(c, opts);
  const root = opts.bpsim === false ? d.root : withBpsim(d.root, bpsimParams(d, c));
  return withHeader({ ...d, root }, APP_VERSION);   // F-B61 (B5b): exporter version, ac: extension, documentation processes
}
/** The `.bpmn` text of a case (F-B1). */
export const exportCaseText = (c: CaseState, opts: ExportOptions = {}): string => serialize(exportDocument(c, opts));

/** True when the document is an in-scope-only export (F-B3: refused as a replacement on import). */
export const isPartial = (d: XDocument): boolean => attr(d.root, 'ac:partial') === 'true';
