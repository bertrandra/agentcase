/** @calc-zone process-model */
import shipped from '../catalog/tools.json';
import type { AuditModel, CatalogTool } from './types';

/**
 * The tool catalogue (F-B23–F-B26, D-B12). The shipped catalogue (`catalog/tools.json`, offline, dated, each entry with its public source) is
 * read-only; a case holds its own entries in `ac:toolCatalog` (client-specific tools, shipped tools edited or retired for the case). The
 * effective catalogue is the shipped one with the case's entries laid over it by code: a newer shipped catalogue never overwrites them.
 */
interface ShippedFile { asOf: string; review: string; tools: Omit<CatalogTool, 'clientSpecific' | 'retired' | 'asOf'>[] }
const FILE = shipped as ShippedFile;
export const SHIPPED_AS_OF = FILE.asOf;
/** The review note of the shipped catalogue (it is a draft until the owner reviews it). */
export const SHIPPED_REVIEW = FILE.review;
export const SHIPPED_TOOLS: readonly CatalogTool[] = FILE.tools.map((t) => ({ ...t, asOf: FILE.asOf, clientSpecific: false, retired: false }));
const SHIPPED_BY_CODE = new Map(SHIPPED_TOOLS.map((t) => [t.code, t]));
export const shippedTool = (code: string): CatalogTool | undefined => SHIPPED_BY_CODE.get(code);

const memo = new WeakMap<readonly CatalogTool[], CatalogTool[]>();
/** The effective catalogue of a case: shipped entries (replaced by the case's entry of the same code) then the case's other entries. */
export function effectiveCatalog(a: Pick<AuditModel, 'caseTools'>): CatalogTool[] {
  const hit = memo.get(a.caseTools);
  if (hit) return hit;
  const own = new Map(a.caseTools.map((t) => [t.code, t]));
  const out = [...SHIPPED_TOOLS.map((t) => own.get(t.code) ?? t), ...a.caseTools.filter((t) => !SHIPPED_BY_CODE.has(t.code))];
  memo.set(a.caseTools, out);
  return out;
}

/** A capability token (`xsd:NMTOKEN`: the 12 of § 15.2 or a custom one without spaces). */
export const CAPABILITY_TOKEN = /^[A-Za-z0-9_.:-]{1,80}$/;

/** The tool capability an activity capability names (case and spaces ignored; "Run / support" → RunSupport). */
export const capabilityKey = (c: string | undefined): string => (c ?? '').replace(/[^A-Za-z]/g, '').toLowerCase();

/**
 * The tools proposed for an activity (F-B24): the effective catalogue's tools that serve its capability and are not retired, ordered by category
 * then name, filtered by a search text (name, vendor, category). Client-specific tools of that capability are offered too.
 */
export function proposedTools(catalog: readonly CatalogTool[], capability: string | undefined, search = ''): CatalogTool[] {
  const key = capabilityKey(capability), q = search.trim().toLowerCase();
  return catalog.filter((t) => !t.retired && (!key || t.capabilities.some((c) => capabilityKey(c) === key))
    && (!q || `${t.name} ${t.vendor ?? ''} ${t.category ?? ''}`.toLowerCase().includes(q)))
    .sort((x, y) => (x.category ?? '').localeCompare(y.category ?? '') || x.name.localeCompare(y.name));
}

/** "Catalogue updated since this audit" (F-B26): the case's catalogue was taken from an older shipped catalogue. */
export const catalogUpdated = (a: Pick<AuditModel, 'catalogAsOf'>): boolean => !!a.catalogAsOf && a.catalogAsOf < SHIPPED_AS_OF;

/** The catalogue as JSON (exchange format, F-B26): the effective catalogue, or the case's own entries. */
export function catalogJson(tools: readonly CatalogTool[], asOf: string): string {
  return `${JSON.stringify({ format: 'agentcase.toolCatalog.v1', asOf, tools }, null, 2)}\n`;
}
