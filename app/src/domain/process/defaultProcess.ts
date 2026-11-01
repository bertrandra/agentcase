/** @calc-zone process-model */
import { buildProcess } from './buildProcess';
import { TODAYS_CATALOGUE } from './catalogue';
import type { ProcessCatalogue } from './types';
import type { XDocument } from './xml';
import { indent } from './xmlWrite';

const built = new WeakMap<ProcessCatalogue, XDocument>();
/**
 * The catalogue process (spec § 6.3): today's catalogues as a BPMN document, laid out and indented, without any case scope. Built once per catalogue.
 * Built from the catalogue lists, which are read from the shipped `catalog/defaultProcess.bpmn` (SPEC_FIXES FX-02, D-B9 (b): the JSON is retired).
 */
export function catalogueProcess(c: ProcessCatalogue = TODAYS_CATALOGUE): XDocument {
  const hit = built.get(c);
  if (hit) return hit;
  const d = buildProcess(c), out: XDocument = { ...d, root: indent(d.root) };
  built.set(c, out);
  return out;
}

export { byRank, mapElements, placeList, ranksOf, type Placed } from './order';
