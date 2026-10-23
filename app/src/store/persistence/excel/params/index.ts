/** @calc-zone exports */
import { APP_VERSION } from '@/domain/version';
import type { Doc } from '@/store/types';
import type { ParamsScope } from './types';

export { buildParamsWorkbook, paramsWorkbookBytes, workbookBytes } from './writer';
export { interpretParams, loadParamsSheets, ParamsImportError, readParamsWorkbook, sameJson, type ParamsPatch } from './reader';
export { LIMITS } from './safe';
export type { ParamsEnv, ParamsScope, SectionInfo } from './types';

/** "v18_11" style tag of a version (legacy appVerFileTag: a trailing ".0" is dropped, dots become underscores). */
export const versionFileTag = (v: string = APP_VERSION): string => `v${v.replace(/\.0+$/, '')}`.replace(/\./g, '_');

const SCOPE_TAG: Record<ParamsScope, string> = { all: 'Parameters_', 'no-factory': 'NoFactory_', 'persona-only': 'PersonaConfig_' };
/** `AgentCase_<version>_<Parameters|NoFactory|PersonaConfig>_<yyyy-mm-dd-hh-mm-ss>.<ext>` — the legacy file name. */
export function paramsFileName(scope: ParamsScope, now: Date = new Date(), ext: 'xlsx' | 'json' = 'xlsx'): string {
  return `AgentCase_${versionFileTag()}_${SCOPE_TAG[scope]}${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
}

const KEEP = ['PERSONAS', 'PERSONA_SECTIONS', 'PERSONA_SECTION_ORDER', 'GROUPS', 'GROUP_COLORS', 'sectionGroups', 'MENU_STRUCTURES', 'SECTION_DEPS', 'SECTION_DEPS_DESC'];
/** The persona / section configuration in the app's native snapshot shape (companion file of the persona-only export). */
export function personaConfigJson(doc: Doc, now: Date = new Date()): string {
  const cfg: Record<string, unknown> = { savedAt: now.toISOString(), currentPersona: doc.currentPersona, scope: 'persona-only' };
  KEEP.forEach((k) => { if (k in doc) cfg[k] = doc[k]; });
  return JSON.stringify(cfg, null, 2);
}
