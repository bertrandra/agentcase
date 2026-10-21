import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import type { CaseState } from '@/domain';
import { asisTobeView, complianceView, execView, kpiView, productivityView, qualityView, velocityView } from '@/domain/verifyB';
import { diffs } from '../helpers/economics';

const ids = readdirSync('fixtures/extras/vb_dom').map((f) => f.replace('.json', '')).sort();
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
type Rows = string[][];
interface Dom {
  kpiCards: Rows; kpiEco: Rows; kpiVq: Rows; kpiComp: Rows; exec: Rows; asis: Rows; prod: Rows; dora: Rows; qual: Rows; qualInputs: string[]; compCards: Rows; comp: Rows;
  charts: Record<string, { labels: string[]; sets: { label: string; data: number[] }[] } | null>;
}
const body = (rows: string[][]) => rows.slice(1);

describe('verify (second half) views reproduce the legacy renders', () => {
  it('has fixtures for the extra cases', () => expect(ids).toEqual(expect.arrayContaining(['golden', 'vb-seq', 'vb-gantt-alt', 'vb-perf-edit', 'vb-scope-l0'])));
  describe.each(ids)('%s', (id) => {
    const c = makeCtx(json(`fixtures/cases/${id}.json`) as CaseState), L = json(`fixtures/extras/vb_dom/${id}.json`) as Dom;
    it('kpi: cards, tables and index chart', () => {
      const v = kpiView(c);
      expect([v.cards, v.eco, v.vq, v.comp]).toEqual([L.kpiCards, body(L.kpiEco), body(L.kpiVq), body(L.kpiComp)]);
      expect(diffs(L.charts.kc!.sets[1]!.data, v.chart)).toEqual([]);
      expect(L.charts.kc!.sets[1]!.label).toBe(`TO-BE ${v.endL}`);
    });
    it('exec timeline', () => {
      const v = execView(c);
      expect(v.rows.map((r) => [r.name, ...r.cells.slice(0, 3), r.cells[3]])).toEqual(body(L.exec).map((r) => r.slice(0, 5)));
      expect(v.sprints.map((s) => s[1])).toEqual(L.charts.ec!.sets.map((s) => s.data[0]));
      expect(v.sprints.map((s) => s[0])).toEqual(L.charts.ec!.sets.map((s) => s.label));
    });
    it('asis-tobe', () => expect(asisTobeView(c).rows).toEqual(body(L.asis)));
    it('productivity', () => {
      const v = productivityView(c), ch = L.charts.prc!;
      const rows = L.prod.slice(2);
      expect(v.rows.map((r) => [r.label, String(r.asis), String(r.y1), String(r.y2), String(r.y3), `${(r.y3 / r.asis).toFixed(1)}x`])).toEqual(rows);
      expect(ch.labels).toEqual(v.rows.map((r) => r.label));
      expect(L.prod[1]![0]).toBe(v.fallback ? `Selected scope maps to no standard throughput category — showing all, scaled to scope intensity (${v.intensity}% auto).`
        : `Showing ${v.count} categor${v.count > 1 ? 'ies' : 'y'} in scope · scope intensity ${v.intensity}% auto (${v.scopeCount}/${v.totalArt} artifacts).`);
    });
    it('velocity and DORA', () => {
      const v = velocityView(c);
      expect(v.rows.map((r) => [r.label, ...r.cells])).toEqual(body(L.dora));
      expect(L.charts.vc!.sets[0]!.data).toEqual(v.velocity);
    });
    it('quality table and radar', () => {
      const v = qualityView(c);
      expect(v.rows.map((r) => r.name)).toEqual(body(L.qual).map((r) => r[0]));
      expect(v.rows.map((r) => [r.y1, r.y2, r.y3])).toEqual(body(L.qual).map((r) => [r[2], r[3], r[4]!.replace(' target', '')]));
      expect(v.rows.flatMap((r) => [String(r.asis), String(r.target)])).toEqual(L.qualInputs);
      expect(v.radarTobe).toEqual(L.charts.qr!.sets[1]!.data);
    });
    it('compliance cards and sector table', () => {
      const v = complianceView(c);
      expect(v.cards).toEqual(L.compCards);
      expect(v.sectors.map((s) => [`${s.name}${s.selected ? ' ◄' : ''}`, s.norms, `${s.ceiling}%`, `${s.max}%`, String(s.reg)])).toEqual(body(L.comp));
      expect(L.charts.cc!.sets.map((s) => s.data)).toEqual([v.sectors.map((s) => s.max), v.sectors.map((s) => s.ceiling)]);
    });
  });
});
