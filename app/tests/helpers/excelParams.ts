import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { produce } from 'immer';
import { LEGACY_SECTIONS } from '@/ui/zones/registry';
import { BUILTIN_PERSONAS } from '@/domain/nav/structures';
import { makeDefaultDoc } from '@/store/instance';
import { applyParamsPatch } from '@/store/persistence/excel/params/apply';
import type { ParamsEnv } from '@/store/persistence/excel/params';
import { sameJson } from '@/store/persistence/excel/params';
import { PERSONA_KEY } from '@/store/persona';
import { legacyCase, withLegacyPatch } from '@/store/persistence/bpmn/legacy';
import type { Doc } from '@/store/types';

/** The workbook (and the legacy file it is compared with) knows the 79 case sections, not the Portfolio ones. */
export const ENV: ParamsEnv = { sections: LEGACY_SECTIONS };
const DIR = 'fixtures/xlsx';
export const xlsxIds = (): string[] => (existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.imported.json')).map((f) => f.replace('.imported.json',
  '')).sort() : []);
export function legacyXlsx(id: string): ArrayBuffer {
  const b = readFileSync(`${DIR}/${id}.xlsx`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
export interface LegacyImport { status: string; notes: string[]; exp: Record<string, unknown>; state: Record<string, unknown>; base?: Record<string, unknown> }
export const legacyImported = (id: string): LegacyImport => JSON.parse(readFileSync(`${DIR}/${id}.imported.json`, 'utf8')) as LegacyImport;
export const PRISTINE = (): { state: Record<string, unknown>; exp: Record<string, unknown> } => JSON.parse(readFileSync(`${DIR}/pristine.json`, 'utf8'));

/** The document after an import: the patch applied the way the command does (replace keys, re-fit, glass-ceiling slider). */
export const applyTo = (base: Doc, patch: Partial<Doc>): Doc => produce(base, (d) => applyParamsPatch(d as Doc, patch));
/**
 * The default case as the legacy app shipped it (its pristine state is what the legacy imports ran against): without the built-in personas added
 * since — Business journey (DEV-MENU-STRUCTURES) — whose menu a legacy "Persona Sections" sheet would otherwise drop, a difference of the base, not
 * of the import.
 */
export const freshDoc = (): Doc => {
  const d = makeDefaultDoc(), ids = new Set(BUILTIN_PERSONAS.map((p) => p.id));
  d.PERSONAS = (d.PERSONAS as { id: string }[]).filter((p) => !ids.has(p.id));
  d.PERSONA_SECTIONS = Object.fromEntries(Object.entries(d.PERSONA_SECTIONS as Record<string, string[]>).filter(([k]) => !ids.has(k)));
  return d;
};
/** The document the legacy import ran against: the pristine case, or (recipes) the recipe's base state laid over it. */
export const importTarget = (leg: LegacyImport): Doc => withLegacyPatch(freshDoc(), leg.base ?? {});   // scope keys: written on the process document

/**
 * Top-level keys of `ours` whose value differs from the legacy state (the pristine value where the legacy left a key alone). The persona is view
 * state of the tab, not a key of our case (D3).
 */
export function stateMismatches(doc: Doc, legacy: Record<string, unknown>, pristine: Record<string, unknown>, ignore: string[] = []): string[] {
  const keys = new Set([...Object.keys(legacy), ...Object.keys(pristine)]), ours = legacyCase(doc);   // schema v3: the scope keys derived from BPMN
  return [...keys].filter((k) => k !== PERSONA_KEY && !ignore.includes(k) && !sameJson(norm(k, ours[k]),
    norm(k, k in legacy ? legacy[k] : pristine[k])));
}
/**
 * The one deliberate difference from the legacy import: its "FM Environments" sheet drops the `isProd` flag of the production environment
 * (the flag is not a column), ours keeps it for the same environment id. Compared without it.
 * Schema v3 (BPMN B3, docs/SPEC_BPMN.md § 6.3): the scope lists are derived from the process document in document order; their order never
 * carried a meaning (every reader treats them as sets), so they are compared as sets (ramp-up sequences by phase).
 */
const SETS = ['selectedArtefacts', 'selectedRegArtefacts', 'selectedNorms', 'phaseOff'];
const norm = (k: string, v: unknown): unknown => {
  if (k === 'ENVIRONMENTS' && Array.isArray(v)) {
    return v.map((e: Record<string, unknown>) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== 'isProd')));
  }
  if (SETS.includes(k) && Array.isArray(v)) return [...(v as string[])].sort();
  if (k === 'phaseSeq' && Array.isArray(v)) return [...(v as { id: string }[])].sort((a, b) => a.id.localeCompare(b.id));
  return v;
};
