/** @calc-zone process-model */
import type { XDocument } from '../process/xml';
import { CAPABILITY_TOKEN, caseCopy, shippedTool, SHIPPED_AS_OF } from './catalog';
import { DATE, KEY } from './ops';
import { readAudit } from './read';
import { AI_FEATURES, HOSTINGS, INTEGRATIONS, LICENCES, type CatalogTool } from './types';
import { catalogXml, onCollaboration, withExtChild } from './write';

/**
 * The case's tool catalogue (F-B24, F-B26, D-B12): `ac:toolCatalog` in the collaboration's extension elements holds the client-specific tools
 * and the shipped tools the case edits or retires. Undoable like any document edit; refused values leave the document as it is. The
 * catalogue's `asOf` is the date of the shipped catalogue the case's entries were made against ("catalogue updated since this audit").
 */
export type CatalogOp =
  | { kind: 'upsert'; tool: CatalogTool } | { kind: 'retire'; code: string; retired: boolean } | { kind: 'remove'; code: string }
  | { kind: 'import'; tools: CatalogTool[] };

const subset = (xs: readonly string[], of: readonly string[]): boolean => xs.every((x) => of.includes(x));
const name = (v: string | undefined, req = false): boolean => (v === undefined ? !req : v.trim().length > 0 && v.length <= 200);

/** A catalogue entry as the XSD allows it, or null. */
export function toolOk(t: CatalogTool): CatalogTool | null {
  const ok = KEY.test(t.code) && name(t.name, true) && name(t.vendor) && name(t.category) && t.capabilities.length > 0
    && t.capabilities.every((c) => CAPABILITY_TOKEN.test(c)) && subset(t.licence, LICENCES) && subset(t.aiFeatures, AI_FEATURES)
    && subset(t.integration, INTEGRATIONS) && subset(t.hosting, HOSTINGS) && (t.asOf === undefined || DATE.test(t.asOf));
  if (!ok) return null;
  return caseCopy({ ...t, name: t.name.trim() });
}

/** The case's entries after `op`, or null when refused. */
function nextTools(cur: readonly CatalogTool[], op: CatalogOp): CatalogTool[] | null {
  const at = (code: string) => cur.findIndex((t) => t.code === code);
  switch (op.kind) {
    case 'upsert': {
      const t = toolOk(op.tool);
      if (!t) return null;
      const i = at(t.code);
      return i < 0 ? [...cur, t] : cur.map((x, j) => (j === i ? t : x));
    }
    case 'retire': {
      const own = cur[at(op.code)] ?? shippedTool(op.code);
      if (!own) return null;
      return nextTools(cur, { kind: 'upsert', tool: { ...own, retired: op.retired } });
    }
    case 'remove': return at(op.code) < 0 ? null : cur.filter((t) => t.code !== op.code);
    case 'import': {
      let out: CatalogTool[] | null = [...cur];
      for (const tool of op.tools) out = out && nextTools(out, { kind: 'upsert', tool });
      return out;
    }
  }
}

/** Apply a catalogue operation to the document (the `ac:toolCatalog` element is created on the first entry and removed with the last). */
export function editCatalog(d: XDocument, op: CatalogOp): XDocument {
  const a = readAudit(d), tools = nextTools(a.caseTools, op);
  if (!tools) return d;
  const xml = tools.length ? catalogXml(tools, a.catalogAsOf ?? SHIPPED_AS_OF) : null;
  return onCollaboration(d, (c) => withExtChild(c, 'toolCatalog', xml));
}
