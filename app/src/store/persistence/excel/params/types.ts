/** @calc-zone exports */
import type * as XL from 'exceljs';
import type { Ctx } from '@/domain';
import type { Persona, MenuGroup } from '@/domain/pdc/personas';
import type { MenuStructure } from '@/domain/nav/structures';
import type { DynSection } from '@/domain/pdc/board';
import type { LocSplit } from '@/domain/verifyA';
import type { Live } from '@/domain/verifyA/fteVfte';
import type { ArtefactEdit, ScurveState, StatusLifecycleState, TokenModel } from '@/domain/types/state';

/** Which sheets an export carries (legacy exportParams scope). */
export type ParamsScope = 'all' | 'no-factory' | 'persona-only';

/** One screen section as the Sections sheet needs it (the catalogue lives in the UI layer, so the caller hands it in). */
export interface SectionInfo { id: string; label: string; group: string; groupSeq: number; description: string; tag?: string; mvp?: boolean }
export interface ParamsEnv { sections: SectionInfo[] }

export type Cell = string | number | boolean;
export type Rows = Cell[][];
export type Sheets = Map<string, Rows>;

export interface StrategyDef {
  id: string; icon?: string; label?: string; desc?: string;
  levers?: { auto?: number | null; y1?: number | null; y2?: number | null; y3?: number | null; ceiling?: number | null; setupF?: number | null; runF?: number | null };
  declared?: { risk?: number; agility?: number }; locSplit?: null | 'ASIS' | Record<string, number>;
}
export interface SectionGroupEntry { id: string; group: string; groupSeq: number; tag?: string; mvp?: boolean }
export type FmRow = Record<string, unknown>;

/** The keys of the case document the parameters workbook touches, typed (the document itself is `Doc`, open-ended). */
export interface ParamsDoc {
  customerName: string; dom: { values: Record<string, string>; checked: Record<string, boolean> };
  RATE: Record<string, Record<string, number>>; teamIn: { skill: string; grade: string; loc: string; etp: number; pins: string[] }[];
  targetLocPct: Record<string, number> | null; selectedArtefacts: string[]; selectedRegArtefacts: string[]; selectedNorms: string[]; phaseOff: string[];
  artefactsEdited: ArtefactEdit[]; regArtefactsEdited: ArtefactEdit[]; regUse: boolean; regInclude: boolean; forceGlassCeiling: boolean;
  QUALITY: [string, number, number, string][]; TOKEN_MODELS: TokenModel[]; TOK_OUT_SHARE: number;
  PERSONAS: Persona[]; PERSONA_SECTIONS: Record<string, string[]>; PERSONA_SECTION_ORDER: Record<string, Record<string, number>>;
  GROUPS: MenuGroup[]; GROUP_COLORS: Record<string, string>; sectionGroups: SectionGroupEntry[]; MENU_STRUCTURES?: MenuStructure[];
  SECTION_DEPS: Record<string, Record<string, 'S' | 'I'>>; SECTION_DEPS_DESC: Record<string, string>;
  scurve: ScurveState; dynamicSections: DynSection[]; lifecycleUse: boolean; lifecyclePos: number; statusLifecycle: StatusLifecycleState[];
  skillMap: Record<string, string>; tobeLocSplit: LocSplit | null; strategyDefs: StrategyDef[];
  VISION: { statement?: string }; INTEGRATED_PRODUCT: { name?: string; buildArtifactIds?: string[] };
  fmPhaseFeatures: { id: string; featureIds: string[] }[];
  [fmKey: string]: unknown;
}

export interface Kit { ws(name: string, cols: [string, number][]): XL.Worksheet }
export interface WriteCtx { wb: XL.Workbook; d: ParamsDoc; c: Ctx; env: ParamsEnv; live(): Live; secs: SectionInfo[] }
export interface ReadCtx {
  w: ParamsDoc; env: ParamsEnv; notes: string[]; secs: SectionInfo[];
  rows(name: string): Rows | null;
  clamp(v: number, mn: number, mx: number, label: string): number;
  hasSection(id: string): boolean;
}
export interface SheetFamily { sheets: string[]; write(x: WriteCtx): void; read(x: ReadCtx): void }
