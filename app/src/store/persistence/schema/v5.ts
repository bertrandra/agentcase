/** @calc-zone exports */
import { v3ToV4 } from './v4';

type Raw = Record<string, unknown>;

/**
 * v4 -> v5 (docs/SPEC_BPMN.md § 6.6, § 21, phase B10a, D-B1 / D-B26): the teams move into the organisation part of the case's BPMN document — each
 * product's entry team (`teamIn`) becomes its `ac:team product`, each portfolio shared team line (`sharedTeam`, with its pins) an `ac:team line`
 * with the products' shares — and the keys are removed; a product's own process document keeps no copy of the organisation (its units move to the
 * common document: the override split). The keys of the file itself are moved by the readers AFTER the validators (`fromSnapshot`,
 * `readPortfolio` through `teamsIntoDocument`), so a damaged team is corrected, with its note, before it is written; this step reads the process
 * text once and converts the snapshot library (its stored cases and portfolios) like a file, through the same store-form conversion.
 */
export const v4ToV5 = (s: Raw): Raw => v3ToV4(s);
