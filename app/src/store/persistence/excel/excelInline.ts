/** @calc-zone exports */
import type { ExcelJS } from './lazy';

/**
 * ExcelJS stored compressed in the single file (docs/ARCHITECTURE.md §9, decision D5). The build (vite.config.ts, `excelPayload`) gzips ExcelJS's
 * browser bundle (`exceljs/dist/exceljs.min.js`, a UMD script), embeds it in the app's script as a base64 string and points `excelSource.ts` here. On
 * the first Excel import / export it is decompressed with the browser's `DecompressionStream` and evaluated as an inline classic `<script>`: the page's
 * policy (`script-src 'unsafe-inline'`) already allows it, so no `blob:` or `'unsafe-eval'` source is added. The script element is removed at once, so
 * a later HTML snapshot does not carry the decompressed copy; the UMD global it defines is taken and deleted.
 */
const GLOBAL = 'ExcelJS';

/** The gzip-compressed bytes of a base64 string, as text. */
export async function gunzipBase64(b64: string): Promise<string> {
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** Run `code` as an inline classic script of `doc` and return the global it defines (`ExcelJS`), removed from the window afterwards. */
export function runInlineScript(code: string, doc: Document = document, name = GLOBAL): unknown {
  const g = (doc.defaultView ?? globalThis) as unknown as Record<string, unknown>, s = doc.createElement('script');
  s.textContent = code;
  (doc.head ?? doc.documentElement).appendChild(s);   // an inline script runs when it is inserted
  s.remove();
  const out = g[name];
  if (!out) throw new Error('Excel support could not be started in this browser (the embedded ExcelJS did not load).');
  delete g[name];
  return out;
}

let pending: Promise<ExcelJS> | null = null;
/** ExcelJS from the embedded payload, decompressed and evaluated once per page (later calls share the first one). */
export function inlineExcelJS(payload: string, doc: Document = document): Promise<ExcelJS> {
  pending ??= gunzipBase64(payload).then((code) => runInlineScript(code, doc) as ExcelJS);
  pending.catch(() => { pending = null; });   // a failure (an old browser) is retried on the next Excel action, not cached
  return pending;
}
