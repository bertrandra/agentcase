import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { produce } from 'immer';
import { LEGACY_SECTIONS } from '@/ui/zones/registry';
import { BUILTIN_PERSONAS } from '@/domain/nav/structures';
import { makeDefaultDoc } from '@/store/instance';
import { applyParamsPatch } from '@/store/persistence/excel/params/apply';
import type { ParamsEnv } from '@/store/persistence/excel/params';
import { sameJson } from '@/store/persistence/excel/params';
import { PERSONA_KEY } from '@/store/persona';
import type { Doc } from '@/store/types';

/** The workbook (and the legacy file it is compared with) knows the 79 case sections, not the Portfolio ones. */
export const ENV: ParamsEnv = { sections: LEGACY_SECTIONS };
const DIR = 'fixtures/xlsx';
export const xlsxIds = (): string[] => (existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.imported.json')).map((f) => f.replace('.imported.json', '')).sort() : []);
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
 * since — Business journey (DEV-MENU-STRUCTURES) — whose menu a legacy "Persona Sections" sheet would otherwise drop, a difference of the base, not of the import.
 */
export const freshDoc = (): Doc => {
  const d = makeDefaultDoc(), ids = new Set(BUILTIN_PERSONAS.map((p) => p.id));
  d.PERSONAS = (d.PERSONAS as { id: string }[]).filter((p) => !ids.has(p.id));
  d.PERSONA_SECTIONS = Object.fromEntries(Object.entries(d.PERSONA_SECTIONS as Record<string, string[]>).filter(([k]) => !ids.has(k)));
  return d;
};
/** The document the legacy import ran against: the pristine case, or (recipes) the recipe's base state laid over it. */
export const importTarget = (leg: LegacyImport): Doc => ({ ...freshDoc(), ...structuredClone(leg.base ?? {}) }) as Doc;

/** Top-level keys of `ours` whose value differs from the legacy state (the pristine value where the legacy left a key alone). The persona is view state of the tab, not a key of our case (D3). */
export function stateMismatches(ours: Doc, legacy: Record<string, unknown>, pristine: Record<string, unknown>, ignore: string[] = []): string[] {
  const keys = new Set([...Object.keys(legacy), ...Object.keys(pristine)]);
  return [...keys].filter((k) => k !== PERSONA_KEY && !ignore.includes(k) && !sameJson(norm(k, (ours as Record<string, unknown>)[k]), norm(k, k in legacy ? legacy[k] : pristine[k])));
}
/**
 * The one deliberate difference from the legacy import: its "FM Environments" sheet drops the `isProd` flag of the production environment
 * (the flag is not a column), ours keeps it for the same environment id. Compared without it.
 */
const norm = (k: string, v: unknown): unknown => (k === 'ENVIRONMENTS' && Array.isArray(v) ? v.map((e: Record<string, unknown>) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== 'isProd'))) : v);
