import { describe, expect, it } from 'vitest';
import { THEME_DEFAULT } from '@/domain/theme';
import { paramsWorkbookBytes, readParamsWorkbook } from '@/store/persistence/excel/params';
import type { Doc } from '@/store/types';
import { ENV, freshDoc } from '../helpers/excelParams';
import { loadExcelJS } from '@/store/persistence/excel/lazy';

/**
 * SPEC_FIXES FX-54 (DEV-EXCEL-FM-PROD): the FM Environments sheet carries each environment's production flag (a Production column), so a new
 * production environment keeps its flag and a cleared flag stays cleared on re-import (before: only the flag the case already had was kept).
 */
type Env = { id: string; name: string; seq: number; isProd?: boolean };
describe('FM environments: the production flag through the parameters workbook (FX-54)', () => {
  it('a new production environment keeps its flag; a cleared one stays cleared', async () => {
    const envs: Env[] = [{ id: 'env-dev', name: 'Dev', seq: 1 }, { id: 'env-prod', name: 'Production', seq: 2 },
      { id: 'env-live', name: 'Live', seq: 3, isProd: true }];
    const d = { ...freshDoc(), ENVIRONMENTS: envs } as unknown as Doc, base = freshDoc();   // base: the default environments (env-prod flagged)
    const { patch } = await readParamsWorkbook(await paramsWorkbookBytes(d, 'all', ENV, THEME_DEFAULT), base, ENV);
    const back = (patch as Record<string, unknown>).ENVIRONMENTS as Env[];
    expect(back.map((e) => [e.id, !!e.isProd])).toEqual([['env-dev', false], ['env-prod', false], ['env-live', true]]);
  });
  it('a workbook without the Production column keeps the flags the case had', async () => {
    const base = freshDoc(), bytes = await paramsWorkbookBytes(base, 'all', ENV, THEME_DEFAULT);
    const X = await loadExcelJS(), wb = new X.Workbook();
    await wb.xlsx.load(bytes);
    wb.getWorksheet('FM Environments')!.spliceColumns(4, 1);   // the layout before FX-54
    const old = await wb.xlsx.writeBuffer() as ArrayBuffer, { patch } = await readParamsWorkbook(old, base, ENV);
    // unchanged environments are left out of the patch: the case keeps its list (and its flag)
    const back = ((patch as Record<string, unknown>).ENVIRONMENTS ?? (base as unknown as Record<string, unknown>).ENVIRONMENTS) as Env[];
    expect(back.filter((e) => e.isProd).map((e) => e.id)).toEqual(['env-prod']);
  });
});
