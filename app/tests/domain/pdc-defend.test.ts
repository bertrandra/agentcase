import { describe, expect, it } from 'vitest';
import { ceilingCoverage, ddBase, ddRows, ddUse, ceilTarget, type DdRow } from '@/domain/pdc/dd';
import { makeDefaultDoc } from '@/store/instance';
import { computeDdSensitivity } from '@/domain/pdc/ddSens';
import { diffs } from '../helpers/economics';
import { ctxOf, pdc, PDC_FIXTURES } from '../helpers/pdc';

const base = ddBase(makeDefaultDoc());
interface LegacyRow { id: string; g: string; l: string; v: unknown; where: string; eff: string; edit: unknown; cls: string; share?: number; role?: string; ok: boolean; ed: [string, string | null] | null; use: object }

describe('due-diligence domain reproduces the legacy register', () => {
  it.each(PDC_FIXTURES)('%s: every row, its value, class, usage, editors and the ceiling coverage', (id) => {
    const c = ctxOf(id), e = pdc<{ rows: LegacyRow[]; cover: number | null; ceilRows: string[] }>('pdc_dd', id), rows = ddRows(c, base);
    const want = e.rows.map((r) => ({ id: r.id, g: r.g, l: r.l, v: r.v ?? null, where: r.where, eff: r.eff, edit: r.edit, cls: r.cls, share: r.share ?? null, role: r.role ?? null, ok: r.ok,
      ed: r.ed ? [Number(r.ed[0]), r.ed[1] == null ? null : Number(r.ed[1])] : null, use: r.use }));
    const got = rows.map((r: DdRow) => ({ id: r.id, g: r.g, l: r.l, v: r.v, where: r.where, eff: r.eff, edit: r.edit, cls: r.cls, share: r.ceilShare ?? null, role: r.ceilRole ?? null, ok: !!r.ok,
      ed: r.ed ? [r.ed.a, r.ed.t] : null, use: ddUse(r) }));
    expect(diffs(want, got)).toEqual([]);
    expect(ceilingCoverage(c, rows)).toBe(e.cover);
    expect(rows.filter((r) => r.id.startsWith('ce')).map((r) => r.id)).toEqual(e.ceilRows);
  });
  it.each(PDC_FIXTURES)('%s: one-at-a-time euro sensitivity ', (id) => {
    const e = pdc<{ base: number; w: Record<string, number>; unmeasurable: string[] }>('pdc_ddsens', id), got = computeDdSensitivity(ctxOf(id));
    expect(diffs(e.w, got.w)).toEqual([]);
    expect(got.base).toBeCloseTo(e.base, 6);
    expect(got.unmeasurable).toEqual(e.unmeasurable);
  });
  it('the naming threshold defaults to 85 %', () => expect(ceilTarget(ctxOf('golden'))).toBe(0.85));
});
