/** @calc-zone exports */
import { libraryV3, portfolioInStore } from '../bpmn/caseFile';
import { caseInStore } from '../bpmn/caseDoc';

type Raw = Record<string, unknown>;
const rec = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const KNOWN_PORTFOLIO = 'agentcase.portfolio.v1';

/** The snapshot library of a case or of the common values, in the version 3 form. */
const withLibrary = (o: Raw): Raw => (o.namedSnapshots === undefined ? o : { ...o, namedSnapshots: libraryV3(o.namedSnapshots) });

/**
 * v2 -> v3 (docs/SPEC_BPMN.md § 6.1, § 6.2, D-B1, D-B26): the case's delivery process becomes ONE native BPMN document, key `BPMN`. It is written
 * from the catalogue process and the case's scope keys (`selectedArtefacts`, `artefactsEdited`, `selectedRegArtefacts`, `regArtefactsEdited`,
 * `phaseOff`, `selectedNorms`, `phaseSeq`, `regInclude`, `skillMap`; a key the file lacks takes the default case's value, as the version 2 reader
 * did), in the normal form of `withScope`, and those keys are removed: from now on they are only derived from the document (`scopeOf`).
 * A portfolio: the common document from the common keys; a product that overrode any of these keys overrides the whole document, written from
 * its effective keys (F-B20). The snapshot library is converted too (its stored cases keep the document as text, like a file).
 * The document is a node tree here (the pipeline reads the text of a version 3 file into the same tree in the validators).
 */
export function v2ToV3(s: Raw): Raw {
  if (s._schema === KNOWN_PORTFOLIO) {
    const out = portfolioInStore(s);
    return rec(out.common) ? { ...out, common: withLibrary(out.common) } : out;
  }
  return withLibrary(caseInStore(s));
}
