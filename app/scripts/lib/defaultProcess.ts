import { caseProcess, scopeKeysOf, serialize, type LegacyScope } from '../../src/domain/process';
import defaultDoc from '../../src/store/defaults/defaultDoc.json';

export const DEFAULT_PROCESS_FILE = 'src/domain/catalog/defaultProcess.bpmn';
/**
 * The text of the default process: the catalogue process carrying the default case's scope (a new case starts from it, spec § 2), in the normal
 * form of schema v3 (B3: `caseProcess`, the same document `makeDefaultDoc().BPMN` holds).
 */
export const defaultProcessText = (): string => serialize(caseProcess(scopeKeysOf(defaultDoc as unknown as LegacyScope)));
