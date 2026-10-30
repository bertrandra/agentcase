import { editorSource, saveEditorXml } from '@/controllers/processEditor';
import type { Sample } from './types';

/** The phase B6 editor command (docs/SPEC_BPMN.md § 9.2): a save of the editor's text that renames one activity. */
export const samples: Record<string, Sample> = {
  'process.applyEditor': () => { saveEditorXml(editorSource().replace('id="A016" name="', 'id="A016" name="Edited: ')); },
};
