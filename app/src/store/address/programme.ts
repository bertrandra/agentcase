/** @calc-zone product-resolution */
import { produceWithPatches } from 'immer';
import { emptiedStoredValues, withProgrammeValues, type XDocument } from '@/domain/process';
import { syncDraft } from '../syncDraft';
import type { AddressCtx } from './types';

type Bag = Record<string, unknown>;

/**
 * Schema v4 (docs/SPEC_BPMN.md § 6.1, § 19.5 B9c): the programme values a command changed in the common values are written into the COMMON
 * document's `ac:programmeValues` as node patches (an attribute value, an entry appended at the end), never as form values. They are diffed against
 * the common document as the command's earlier patches left it (its own process edits, when they went to the common document).
 */
export function programmePatches(c: AddressCtx): void {
  if (!c.programme) return;
  const touched = c.out.some((p) => p.path[0] === 'common' && p.path[1] === 'BPMN');
  const cur = (touched ? c.next.BPMN : c.pf.common.BPMN) as XDocument, next = withProgrammeValues(cur, c.programme);
  if (next === cur) return;
  const [, patches] = produceWithPatches(cur, (d) => { syncDraft(d as unknown as Bag, cur as unknown as Bag, next as unknown as Bag); });
  for (const p of patches) c.out.push({ ...p, path: ['common', 'BPMN', ...p.path] });
}

/**
 * The document a product's whole-document override starts from (F-B20): the effective one without a copy of the programme's values (an empty
 * `ac:programmeValues` in its place, so the paths of the other nodes stay those of the command's patches). The product keeps reading the common
 * document's values, with its per-field overrides on top (`portfolio/layers.ts`).
 */
export const overrideDocument = (d: unknown): unknown =>
  (d && typeof d === 'object' && (d as Bag).kind === 'document' ? emptiedStoredValues(d as XDocument) : d);
