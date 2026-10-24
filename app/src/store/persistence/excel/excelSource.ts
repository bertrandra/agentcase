/** @calc-zone exports */
/**
 * Where ExcelJS comes from. In the dev server and the tests: the package, imported on demand. In the production build this module is REPLACED by the
 * `excelPayload` plugin of vite.config.ts with one that decompresses the copy embedded in the single file (`excelInline.ts`), so the bundle does not
 * carry ExcelJS as code (about 940 kB of the 3.2 MB file).
 */
export const excelSource = (): Promise<unknown> => import('exceljs');
