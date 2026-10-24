import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { gunzipBase64, inlineExcelJS, runInlineScript } from '@/store/persistence/excel/excelInline';

/**
 * Decision D5: the built single file carries ExcelJS gzip-compressed (vite.config.ts `excelPayload`) and starts it on the first Excel use. The real run
 * (decompression in Chromium, the inline script under the page's CSP, every workbook export / import) is covered by tools/e2e-flows.mjs and
 * tools/parallel-run.mjs on the BUILT app; here, the pieces.
 */
const b64 = (s: string) => gzipSync(Buffer.from(s, 'utf8'), { level: 9 }).toString('base64');

/** A document whose inserted inline scripts run (what a browser does), recording what was inserted and removed. */
function fakeDoc() {
  const win: Record<string, unknown> = {}, log: string[] = [];
  const doc = {
    defaultView: win,
    createElement: () => {
      const el = { textContent: '', remove: () => log.push('removed') };
      return el;
    },
    head: { appendChild: (el: { textContent: string }) => { log.push('inserted'); new Function('window', el.textContent)(win); } },
    documentElement: null,
  };
  return { doc: doc as unknown as Document, win, log };
}

describe('ExcelJS embedded compressed (D5)', () => {
  it('gunzipBase64 restores the text byte for byte (UTF-8 included)', async () => {
    const text = 'const x = "Éclair ✓";\n'.repeat(500);
    expect(await gunzipBase64(b64(text))).toBe(text);
  });
  it('the payload of the real UMD bundle decompresses to the file the build embeds', async () => {
    const umd = readFileSync('node_modules/exceljs/dist/exceljs.min.js', 'utf8');
    expect(await gunzipBase64(b64(umd))).toBe(umd);
  });
  it('runs the script once, removes its element, takes the UMD global and deletes it from the window', () => {
    const { doc, win, log } = fakeDoc();
    const out = runInlineScript('window.ExcelJS = { Workbook: function Workbook() {} };', doc);
    expect(typeof (out as { Workbook: unknown }).Workbook).toBe('function');
    expect(log).toEqual(['inserted', 'removed']);
    expect('ExcelJS' in win).toBe(false);
  });
  it('a script that defines nothing fails with a message; inlineExcelJS decodes once and shares the result', async () => {
    expect(() => runInlineScript('/* nothing */', fakeDoc().doc)).toThrow(/Excel support could not be started/);
    const { doc, log } = fakeDoc(), payload = b64('window.ExcelJS = { n: 1 };');
    const [a, b] = await Promise.all([inlineExcelJS(payload, doc), inlineExcelJS(payload, doc)]);
    expect(a).toBe(b);
    expect(log.filter((l) => l === 'inserted')).toHaveLength(1);
  });
});
