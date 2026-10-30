import { current, isDraft } from 'immer';
import { editableKeys, scopeOf, withScope, type ScopeKeys, type XDocument } from '@/domain/process';
import { syncDraft } from './syncDraft';
import type { Doc } from './types';

type Bag = Record<string, unknown>;

/** The plain value of the case's process document inside a command: the draft's current state (the stored object itself while unchanged). */
export const processIn = (d: Doc): XDocument => (isDraft(d.BPMN) ? current(d.BPMN) : d.BPMN) as XDocument;

/**
 * THE WRITE PATH of the process document (docs/SPEC_BPMN.md § 6.1, § 9). `fn` returns the next tree, sharing every unchanged node with the
 * current one (`withAttrs`, `withChildren`, `mapElements`); the draft receives only the differences, so the command's undo patches address the
 * nodes that changed (an attribute value, an element), never the whole document.
 */
export function editProcess(d: Doc, fn: (doc: XDocument) => XDocument): void {
  const cur = processIn(d), next = fn(cur);
  if (next === cur) return;
  if (isDraft(d.BPMN)) syncDraft(d.BPMN as unknown as Bag, cur as unknown as Bag, next as unknown as Bag);
  else d.BPMN = next;
}

/** The scope keys (legacy view) as a command sees them now, after the edits it already made. */
export const scopeNow = (d: Doc): ScopeKeys => scopeOf({ BPMN: processIn(d) });

/**
 * A legacy scope command (selection, phases, norms, ramp-up sequences, regulatory inclusion, skill map): its rule runs on a copy of the scope keys
 * exactly as it ran on the version 2 keys, and the result is written back on the document by `withScope` (attribute and element updates).
 */
export function editScope(d: Doc, fn: (k: ScopeKeys) => void): void {
  editProcess(d, (doc) => {
    const k = editableKeys(scopeOf({ BPMN: doc }));
    fn(k);
    return withScope(doc, k);
  });
}
