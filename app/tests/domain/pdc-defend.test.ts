import { describe, expect, it } from 'vitest';
import { model } from '@/domain';
import { headline } from '@/domain/economics/headline';
import { fmtRoiPct } from '@/domain/economics/roi';
import { ceilingCoverage, ddBase, ddRows, ddUse, ceilTarget, type DdRow } from '@/domain/pdc/dd';
import { makeDefaultDoc } from '@/store/instance';
import { calcChain } from '@/domain/pdc/verifChain';
import { verifChecks } from '@/domain/pdc/verifChecks';
import { convergenceChecks } from '@/domain/pdc/verifConvergence';
import { provenance } from '@/domain/pdc/verifProvenance';
import { directionalSensitivity } from '@/domain/pdc/verifSensi';
import { computeDdSensitivity } from '@/domain/pdc/ddSens';
import { diffs } from '../helpers/economics';
import { ctxOf, pdc, PDC_FIXTURES } from '../helpers/pdc';

const base = ddBase(makeDefaultDoc());
interface LegacyRow { id: string; g: string; l: string; v: unknown; where: string; eff: string; edit: unknown; cls: string; share?: number; role?: string;
  ok: boolean; ed: [string, string | null] | null; use: object }

describe('due-diligence domain reproduces the legacy register', () => {
  it.each(PDC_FIXTURES)('%s: every row, its value, class, usage, editors and the ceiling coverage', (id) => {
    const c = ctxOf(id), e = pdc<{ rows: LegacyRow[]; cover: number | null; ceilRows: string[] }>('pdc_dd', id), rows = ddRows(c, base);
    const want = e.rows.map((r) => ({ id: r.id, g: r.g, l: r.l, v: r.v ?? null, where: r.where, eff: r.eff, edit: r.edit, cls: r.cls, share: r.share ?? null,
      role: r.role ?? null, ok: r.ok,
      ed: r.ed ? [Number(r.ed[0]), r.ed[1] == null ? null : Number(r.ed[1])] : null, use: r.use }));
    const got = rows.map((r: DdRow) => ({ id: r.id, g: r.g, l: r.l, v: r.v, where: r.where, eff: r.eff, edit: r.edit, cls: r.cls, share: r.ceilShare ?? null,
      role: r.ceilRole ?? null, ok: !!r.ok,
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
  describe('logic verification', () => {
    interface V { checks: string[][]; chain: string[][]; sensi: string[][]; prov: string[][]; conv: string[][] }
    it.each(PDC_FIXTURES)('%s: the 16 checks, the calculation chain and the directional sensitivity', (id) => {
      const c = ctxOf(id), e = pdc<V>('pdc_verif', id);
      expect(verifChecks(c).map((x, i) => [String(i + 1), x.name, x.exp, x.got, x.ok ? '✓ OK' : '✗ GAP'])).toEqual(e.checks.slice(1));
      const sensi = directionalSensitivity(c).map((x) => [x.variation, x.expected, x.observed,
        x.ok === null ? 'n/a (at limit)' : x.ok ? '✓ Consistent' : '✗ Abnormal']);
      if (model(c).horizon === 3) {
        expect(calcChain(c)).toEqual(e.chain.slice(1));
        expect(sensi).toEqual(e.sensi.slice(1));
        return;
      }
      // DEV-HORIZON-SUMS: the legacy ROI / savings sums read the three-entry yearSav whatever the horizon; v19 sums the horizon's years.
      const chain = calcChain(c);
      expect(chain.slice(0, -1)).toEqual(e.chain.slice(1, -1));
      expect(chain[chain.length - 1]![3]).toBe(fmtRoiPct(headline(c).roi));
      expect(sensi.map((r) => [r[0], r[1]])).toEqual(e.sensi.slice(1).map((r) => [r[0], r[1]]));
      expect(sensi.every((r) => r[3] !== '✗ Abnormal')).toBe(true);
    });
    it.each(PDC_FIXTURES)('%s: provenance tables and the convergence checks that exist in this build', (id) => {
      const c = ctxOf(id), e = pdc<V>('pdc_verif', id), p = provenance(c);
      const ovLegacy = e.prov.filter((r) =>
        /^(Engagement context|Knowledge hub|Verification tax|AI code-quality|External rework|Internal loop|SDD|Pillar|Risk register|AI-Act)/.test(r[0]!)
        && r.length === 3 && !r[0]!.includes('vs'));
      expect(p.overlays.map((o) => [`${o.name}${o.euro ? ' · affects €' : ' · verdict only'}`, o.active ? 'ACTIVE' : 'neutral', o.effect])).toEqual(ovLegacy);
      expect(p.guards.map((g) => [g.name, g.what, g.ok ? 'OK' : 'REVIEW', g.detail])).toEqual(e.prov.filter((r) => r.length === 4 && ['OK',
        'REVIEW'].includes(r[2]!)));
      const legacy = new Map(e.conv.filter((r) => r.length === 4).map((r) => [r[0]!, r]));
      for (const x of convergenceChecks(c)) expect([x.id, x.name, x.pass ? 'PASS' : 'FAIL', x.detail]).toEqual(legacy.get(x.id));
    });
  });
});
