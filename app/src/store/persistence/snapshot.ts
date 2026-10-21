import { makeDefaultDoc } from '../instance';
import type { Doc } from '../types';

export const SNAPSHOT_SCHEMA = 'agentcase.snapshot.v1';
export class SnapshotError extends Error {}

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

/** Deep copy that drops prototype-pollution keys and non-JSON values (legacy review item L-13). */
export function sanitize<T>(v: T): T {
  if (Array.isArray(v)) return v.map(sanitize) as unknown as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!FORBIDDEN.has(k)) out[k] = sanitize(x);
    return out as T;
  }
  return v;
}

/** Document → snapshot JSON (same shape as the legacy collectSnapshotState(), plus a schema tag). */
export function toSnapshot(doc: Doc, now: () => Date = () => new Date()): Record<string, unknown> {
  return { ...structuredClone(doc), savedAt: now().toISOString(), _schema: SNAPSHOT_SCHEMA };
}

/**
 * Snapshot JSON → document. Accepts legacy snapshots (no schema tag). Keys the snapshot does not carry take the code defaults,
 * so new defaults reach old files; a snapshot without form inputs is rejected.
 */
export function fromSnapshot(raw: unknown): Doc {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SnapshotError('Snapshot must be a JSON object');
  const snap = sanitize(raw as Record<string, unknown>);
  const dom = snap.dom as { values?: unknown; checked?: unknown } | undefined;
  if (!dom || typeof dom !== 'object' || typeof dom.values !== 'object' || typeof dom.checked !== 'object') throw new SnapshotError('Snapshot has no form inputs (dom)');
  const doc = { ...makeDefaultDoc(), ...snap } as Doc;
  delete doc.savedAt; delete doc._schema;
  doc.dom = { values: { ...makeDefaultDoc().dom.values, ...(dom.values as object) }, checked: { ...makeDefaultDoc().dom.checked, ...(dom.checked as object) } } as Doc['dom'];
  return doc;
}
