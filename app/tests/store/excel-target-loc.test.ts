import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '@/domain/catalog';
import { THEME_DEFAULT } from '@/domain/theme';
import { paramsWorkbookBytes, readParamsWorkbook } from '@/store/persistence/excel/params';
import type { Doc } from '@/store/types';
import { ENV, freshDoc } from '../helpers/excelParams';

/** SPEC_FIXES FX-53 (DEV-EXCEL-TARGET-LOC): the Location Target sheet carries the full target share, so a re-import gives back the same mix. */
describe('Location Target in the parameters workbook (FX-53)', () => {
  it('a 33.333 % target survives the round trip', async () => {
    const names = LOCATIONS.map((l) => l.name), t = Object.fromEntries(names.map((n, i) => [n, i < 3 ? 100 / 3 : 0]));
    const d: Doc = { ...freshDoc(), targetLocPct: t };
    const { patch } = await readParamsWorkbook(await paramsWorkbookBytes(d, 'all', ENV, THEME_DEFAULT), d, ENV);
    const back = (patch.targetLocPct ?? d.targetLocPct) as Record<string, number>;
    for (const n of names) expect(back[n]).toBeCloseTo(t[n]!, 9);
  });
});
