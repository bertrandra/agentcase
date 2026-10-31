/** @calc-zone product-resolution */
import { produceWithPatches } from 'immer';
import { deepEqual, ownRows } from '@/domain/portfolio';
import { emptiedStoredValues, withProgrammeValues, type XDocument } from '@/domain/process';
import { isCarrier, withProductTeam, withTeamsOf, withoutOrg, withoutTeams } from '@/domain/org';
import { syncDraft } from '../syncDraft';
import { add, productPath, remove, type AddressCtx, type Path } from './types';

type Bag = Record<string, unknown>;

/** The node patches that turn `cur` into `next`, under `at` (an attribute value, an element appended or removed: never the whole document). */
function diffAt(c: AddressCtx, at: Path, cur: XDocument | undefined, next: XDocument): void {
  if (next === cur) return;
  if (!cur) { add(c, at, next); return; }
  const [, patches] = produceWithPatches(cur, (d) => { syncDraft(d as unknown as Bag, cur as unknown as Bag, next as unknown as Bag); });
  for (const p of patches) c.out.push({ ...p, path: [...at, ...p.path] });
}

/**
 * The document a product's whole-document override starts from (F-B20, the override split of phase B10a): the effective one without the
 * organisation (units and teams stay in the common document) and without a copy of the programme's values (an empty `ac:programmeValues`).
 */
export const overrideDocument = (d: XDocument): XDocument => withoutOrg(emptiedStoredValues(d));

/** What a case command did to the process document: nothing, an edit (or a whole replacement), or the removal of the key. */
export type ProcessChange = 'none' | 'edit' | 'remove';

/**
 * The process change goes to the product's own document: it has one, or the edit scope is the product (unless the change is a whole replacement
 * equal to the common process).
 */
function toProduct(c: AddressCtx, next: XDocument, whole: boolean): boolean {
  if (c.scope === 'common') return false;
  if (c.prod.overrides.BPMN !== undefined) return true;
  return c.scope === 'product' && !(whole && deepEqual(withoutTeams(c.pf.common.BPMN as XDocument | undefined), next));
}

/**
 * THE DOCUMENTS OF A CASE COMMAND (schema v5, docs/SPEC_BPMN.md § 6.1, § 21; B9c for the programme values). The command ran on the active product's
 * case, whose document has no stored teams; its process edit, its entry team change and its programme values are written as node patches:
 * - the process edit into the product's own document (made from the result when new, without the organisation) or into the COMMON document,
 *   whose stored teams are put back (an import or an editor save replaces the process, never the teams);
 * - the product's own rows of its entry team into its team in the common document's organisation part (a line edited, appended or removed);
 * - the programme values into the common document's `ac:programmeValues` (an attribute, or an entry appended at the end).
 */
export function documentPatches(c: AddressCtx, process: ProcessChange, whole: boolean, team: boolean): void {
  const next = c.next.BPMN as XDocument | undefined, own = c.prod.overrides.BPMN as XDocument | undefined;
  const edit = process === 'edit' && !!next, mine = edit && toProduct(c, next as XDocument, whole);
  if (process === 'remove' && c.scope !== 'common' && own) remove(c, productPath(c, 'overrides', 'BPMN'));
  if (mine && own) diffAt(c, productPath(c, 'overrides', 'BPMN'), own, withoutOrg(next as XDocument));
  else if (mine) add(c, productPath(c, 'overrides', 'BPMN'), overrideDocument(next as XDocument));
  const cur = c.pf.common.BPMN as XDocument | undefined;
  let doc = edit && !mine ? withTeamsOf(next as XDocument, cur) : cur;
  if (team) doc = withProductTeam(doc, c.prod.id, ownRows(c.next.teamIn));
  if (c.programme && doc && !isCarrier(doc)) doc = withProgrammeValues(doc, c.programme);
  if (doc) diffAt(c, ['common', 'BPMN'], cur, doc);
}
