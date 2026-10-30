import { processFromCase, serialize } from '../../src/domain/process';
import type { CaseState } from '../../src/domain/types/state';
import defaultDoc from '../../src/store/defaults/defaultDoc.json';

export const DEFAULT_PROCESS_FILE = 'src/domain/catalog/defaultProcess.bpmn';
/** The text of the default process: the catalogue process carrying the default case's scope (a new case starts from it, spec § 2). */
export const defaultProcessText = (): string => serialize(processFromCase(defaultDoc as unknown as CaseState));
