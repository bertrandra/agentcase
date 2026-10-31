/** @calc-zone exports */
import { processOf } from '../bpmn/caseDoc';
import { v2ToV3 } from './v3';

type Raw = Record<string, unknown>;
const rec = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
/** The object with its process document read into the tree (null: it cannot be read). */
function parsed(o: unknown): unknown {
  if (!rec(o) || o.BPMN === undefined) return o;
  const d = processOf(o.BPMN);
  return typeof d === 'string' ? null : { ...o, BPMN: d };
}
/** The file with every process document read once (null: one cannot be read, left to the validators, which note the correction). */
function withTrees(s: Raw): Raw | null {
  if (!rec(s.common)) return parsed(s) as Raw | null;
  const common = parsed(s.common), products = Array.isArray(s.products)
    ? s.products.map((p) => (rec(p) && rec(p.overrides) ? { overrides: parsed(p.overrides), p } : { overrides: undefined, p })) : null;
  if (common === null || products?.some((x) => x.overrides === null)) return null;
  const out = products?.map((x) => (x.overrides === undefined ? x.p : { ...(x.p as Raw), overrides: x.overrides }));
  return { ...s, common, ...(out ? { products: out } : {}) };
}

/**
 * v3 -> v4 (docs/SPEC_BPMN.md § 6.1, § 19.5 B9c, D-B1 / D-B26): the transformation programme's stored values move from the case keys into the
 * case's BPMN document, one `ac:programmeValues` element of the delivery process (`domain/process/storedValues.ts`, keys in
 * `domain/programme/storedKeys.ts`): the opt-in switches, the cost profile types, the activity descriptions, the WBS code overrides and every
 * programme activity parameter (pilot, setup lines with the coaching calibration amount, training and governance resources, hub, stages,
 * capability, build, AgentOps, and the legacy training / governance amounts). A key the file lacks takes the default case's value (as the
 * version 3 reader filled it). A portfolio: the common values move into the common document; a product's per-field overrides stay
 * its own part (its sparse override), a product's whole-document override keeps no copy. The snapshot library is converted too.
 * It is the store-form conversion of the version 3 migration (`caseInStore` / `portfolioInStore` include it since B9c): the process text is read
 * into the tree and the values moved. A file with a document that cannot be read is left as it is: the validators note the correction and the
 * readers (`fromSnapshot`, `readPortfolio`, through the same conversion) move the values.
 */
export function v3ToV4(s: Raw): Raw {
  const t = withTrees(s);
  return t ? v2ToV3(t) : s;
}
