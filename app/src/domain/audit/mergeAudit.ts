/** @calc-zone process-model */
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { editElementAudit } from './edit';
import { editCatalog } from './editCatalog';
import type { ElementOp } from './ops';
import { readAudit } from './read';
import type { ElementAudit, Provenance } from './types';

/**
 * The audit data of a Merge import (SPEC_FIXES FX-25): the file's `ac:audit` of each task the import matched, and of each resource both hold, is
 * merged into the case's by element id. An observation (same field and role) or a tool in use (same code) present on both sides keeps the one
 * with the NEWER date (no date = the oldest; a tie keeps the case's); pain points and evidence are added unless already there. The case's
 * header is kept; the file's catalogue entries the case does not hold are added. Everything is part of the import's one undoable step, so the
 * values it replaced stay in the history (Ctrl+Z). Returns the document and the number of values taken from the file.
 */
const newer = (file: Provenance, cur: Provenance | undefined): boolean => !cur || (file.date ?? '') > (cur.date ?? '');

function opsFor(cur: ElementAudit | undefined, file: ElementAudit): ElementOp[] {
  const ops: ElementOp[] = [];
  for (const o of file.observations) {
    if (newer(o, cur?.observations.find((x) => x.name === o.name && x.role === o.role))) ops.push({ kind: 'observation', obs: o });
  }
  for (const t of file.tools) if (newer(t, cur?.tools.find((x) => x.ref === t.ref))) ops.push({ kind: 'tool', use: t });
  for (const p of file.painPoints) if (!cur?.painPoints.some((x) => x.text === p.text)) ops.push({ kind: 'painPoint', point: p });
  for (const v of file.evidence) if (!cur?.evidence.some((x) => x.name === v.name)) ops.push({ kind: 'evidence', evidence: v });
  return ops;
}

/** `pairs`: file element id → case element id (the import's matches); resources with the same id on both sides are added to them. */
export function mergeImportedAudit(d: XDocument, file: XDocument, pairs: ReadonlyMap<string, string>): { doc: XDocument; taken: number } {
  const theirs = readAudit(file);
  if (!theirs.elements.size && !theirs.caseTools.length) return { doc: d, taken: 0 };
  const ours = readAudit(d), roles = new Set(readProcess(d).actors.map((a) => a.id)), all = new Map(pairs);
  for (const id of theirs.elements.keys()) if (roles.has(id) && !all.has(id)) all.set(id, id);
  let doc = d, taken = 0;
  for (const [from, to] of all) {
    const f = theirs.elements.get(from);
    if (!f) continue;
    for (const op of opsFor(ours.elements.get(to), f)) {
      const next = editElementAudit(doc, to, op);
      if (next !== doc) taken++;
      doc = next;
    }
  }
  const own = new Set(ours.caseTools.map((t) => t.code)), extra = theirs.caseTools.filter((t) => !own.has(t.code));
  if (extra.length) { const next = editCatalog(doc, { kind: 'import', tools: extra }); if (next !== doc) taken += extra.length; doc = next; }
  return { doc, taken };
}
