/** @calc-zone exports */
import { buildCalcPackage } from '@/domain/calcPackage';
import { makeDefaultDoc } from '../instance';
import { PERSONA_KEY } from '../persona';
import { SnapshotError } from './errors';
import { VERSION_KEY, versionStamp } from './schema/version';
import { caseInStore, isTrustedTree } from './bpmn/caseDoc';
import { caseInFile } from './bpmn/caseFile';
import type { Doc } from '../types';

export const SNAPSHOT_SCHEMA = 'agentcase.snapshot.v1';
export { SnapshotError };

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

/** Deep copy that drops prototype-pollution keys and non-JSON values (legacy review item L-13). */
export function sanitize<T>(v: T): T {
  if (isTrustedTree(v)) return v;   // a process tree the reader built or checked (immutable): kept as it is
  if (Array.isArray(v)) return v.map(sanitize) as unknown as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!FORBIDDEN.has(k)) out[k] = sanitize(x);
    return out as T;
  }
  return v;
}

/**
 * Document → snapshot JSON (same shape as the legacy collectSnapshotState(), plus a schema tag and the file schema version). The process
 * document is written as its XML text (`BPMN`, schema v3).
 */
export function toSnapshot(doc: Doc, now: () => Date = () => new Date()): Record<string, unknown> {
  return { ...structuredClone(caseInFile(doc)), savedAt: now().toISOString(), _schema: SNAPSHOT_SCHEMA, ...versionStamp(), ...packageOf(doc) };
}

/** The canonical calculation package (legacy v18.5 `calculationPackage`) stamped into every saved case; never read back as input. */
function packageOf(doc: Doc): { calculationPackage?: unknown } {
  try { return { calculationPackage: buildCalcPackage(doc) }; } catch (e) { console.error('Snapshot: calculation package failed', e); return {}; }
}

/** The package a snapshot carries, or undefined (legacy files saved before v18.5). The caller compares it with the recomputed case. */
export function packageOfSnapshot(raw: unknown): unknown {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? sanitize((raw as Record<string, unknown>).calculationPackage) : undefined;
}

/**
 * Snapshot JSON → document. Accepts legacy snapshots (no schema tag). Keys the snapshot does not carry take the code defaults,
 * so new defaults reach old files; a snapshot without form inputs is rejected.
 */
export function fromSnapshot(raw: unknown): Doc {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SnapshotError('Snapshot must be a JSON object');
  const snap = sanitize(raw as Record<string, unknown>);
  if (snap._schema === 'agentcase.portfolio.v1') throw new SnapshotError('This file holds a portfolio, not a single case: open it with openSnapshot()');
  const dom = snap.dom as { values?: unknown; checked?: unknown } | undefined;
  if (!dom || typeof dom !== 'object' || typeof dom.values !== 'object'
    || typeof dom.checked !== 'object') throw new SnapshotError('Snapshot has no form inputs (dom)');
  const bad = (why: string): never => { throw new SnapshotError(`The process document (BPMN) cannot be read: ${why}`); };
  const doc = { ...makeDefaultDoc(), ...caseInStore(snap, bad) } as Doc;   // schema v3: the process document (a version 2 case's keys become it)
  // the persona the file opens on: `openSnapshot`
  delete doc.savedAt; delete doc._schema; delete doc[VERSION_KEY]; delete doc.calculationPackage; delete doc[PERSONA_KEY];
  doc.dom = { values: { ...makeDefaultDoc().dom.values, ...(dom.values as object) },
    checked: { ...makeDefaultDoc().dom.checked, ...(dom.checked as object) } } as Doc['dom'];
  return doc;
}
