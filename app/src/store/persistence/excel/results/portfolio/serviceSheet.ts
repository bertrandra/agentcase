/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import type { ServiceView } from '@/domain/portfolio';
import { cardSheet, MONEY, PCT, table } from './blocks';

/**
 * Sheet "Services" (SPEC_FIXES FX-31, § 21.7): per shared service, what it delivers to each product (activities, effort, share of the effort, FTE
 * and annual cost the product carries) and its lines (rule, FTE, cost, what no product holds). Numbers are the Services view's (`servicesView`),
 * the same figures as 🏢 Organisation › Services. Written only when the portfolio has a shared service.
 */
export function servicesSheet(wb: Workbook, name: string, services: readonly ServiceView[]): void {
  if (!services.length) return;
  const ws = wb.addWorksheet(name), names = (s: ServiceView) => new Map(s.products.map((p) => [p.productId, p.name]));
  cardSheet(ws, services.flatMap((s): [string, number, string][] => [[`${s.name}: FTE (Σ lines)`, s.capacity, PCT],
    [`${s.name}: annual cost`, s.cost, MONEY]]));
  for (const s of services) {
    table(ws, `Service ${s.name}: delivery by product`, ['Product', 'Activities', 'Effort', 'Share of the effort %', 'FTE', 'Annual cost'],
      s.products.map((p) => [p.name, p.activities.length, p.effort, p.effortPct, p.fte, p.cost]), [undefined, undefined, PCT, PCT, PCT, MONEY]);
    const label = names(s);
    table(ws, `Service ${s.name}: lines`, ['Line', 'Rule', 'FTE', 'Annual cost', 'Shares', 'Unallocated %', 'Unallocated cost'],
      s.lines.map((l) => [`${l.line.skill} · ${l.line.grade} · ${l.line.loc}`, l.rule === 'effort' ? 'split by effort' : 'fixed shares', l.line.etp, l.cost,
        l.shares.map((x) => `${label.get(x.productId) ?? x.productId} ${x.pct.toFixed(1)} %`).join('; '), l.unallocatedPct, l.unallocatedCost]),
      [undefined, undefined, PCT, MONEY, undefined, PCT, MONEY]);
  }
  ws.getColumn(1).width = 46;
}
