/** @calc-zone scope-automation */
import { gunzipBase64, runInlineScript } from '@/store/persistence/excel/excelInline';
import type { BpmnKit, ModelerClass } from './processEditorKit';

/**
 * bpmn-js stored compressed in the single file (phase B6, the ExcelJS pattern of decision D5, docs/ARCHITECTURE.md §9). The build (vite.config.ts,
 * `bpmnPayload`) gzips `{ js, css }` (bpmn-js's browser bundle `bpmn-modeler.production.min.js`, a UMD script defining `BpmnJS`, and its three
 * style sheets) and embeds it as one base64 string, marked by `PREFIX` so that tools/perf.mjs can measure it apart from the app. On the first
 * "Edit diagram" it is decompressed (`DecompressionStream`) and run as an inline classic script, allowed by the page's policy
 * (`script-src 'unsafe-inline'`): no `blob:`, no `'unsafe-eval'`, no network. The script element is removed at once; the global is taken and deleted.
 */
export const PREFIX = 'agentcase-bpmn-js:';

let pending: Promise<BpmnKit> | null = null;
/** The editor kit from the embedded payload, decompressed and evaluated once per page (later calls share the first one). */
export function inlineBpmnJs(payload: string, doc: Document = document): Promise<BpmnKit> {
  pending ??= gunzipBase64(payload.slice(PREFIX.length)).then((text) => {
    const { js, css } = JSON.parse(text) as { js: string; css: string };
    try {
      return { Modeler: runInlineScript(js, doc, 'BpmnJS') as ModelerClass, css };
    } catch {
      throw new Error('The diagram editor could not be started in this browser (the embedded bpmn-js did not load).');
    }
  });
  pending.catch(() => { pending = null; });   // a failure is retried on the next opening, not cached
  return pending;
}
