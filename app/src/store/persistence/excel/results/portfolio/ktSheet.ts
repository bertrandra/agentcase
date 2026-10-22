import type { Workbook } from 'exceljs';
import { infraView, knowledgeTable, waveEffects, waveEffectsTotal, type Portfolio } from '@/domain/portfolio';
import { cardSheet, MONEY, PCT, table } from './blocks';

/**
 * Sheet "Knowledge transfer": the F29 table (`knowledgeTable`, one line per kept product, totals), the hub effect by wave (F31, `waveEffects`) and the
 * infrastructure allocation with its conservation check (`infraView`). Same rows as the Knowledge transfer section.
 */
export function ktSheet(wb: Workbook, name: string, pf: Portfolio): void {
  const ws = wb.addWorksheet(name), kt = knowledgeTable(pf), waveName = (id: string | null) => pf.waves.find((w) => w.id === id)?.name ?? 'Not scheduled';
  cardSheet(ws, [['Hub enabled', pf.hub.enabled ? 'Yes' : 'No'], ['Infrastructure (EUR per month)', pf.hub.infraMonthly, MONEY], ['Allocation', pf.hub.infraAllocation],
    ['KT setup, all products', kt.totals.setup, MONEY], ['Curation and infrastructure per year', kt.totals.annual, MONEY], ['KT days avoided per year', kt.totals.ktDays, PCT],
    ['KT value avoided over the horizon', kt.totals.ktAvoided, MONEY], ['Extra savings from the hub over the horizon', kt.totals.hubDeltaSav, MONEY]]);
  const rows = kt.rows.map((r) => [r.name, waveName(r.waveId), r.usesHub ? 'Yes' : r.locked ? 'Locked by context' : 'No', r.asisCC, r.targetCC + (r.capped ? ' (capped)' : ''), r.mult,
    r.domains.map((d) => `${d.label} ${d.weightPct}%`).join('; '), r.lead, r.prepMonth ?? 'not scheduled', r.setup, r.annual, r.ktDays, r.ktAvoided, r.hubDeltaSav]);
  table(ws, 'By product', ['Product', 'Wave', 'Uses the hub', 'Initial CC', 'Target CC', 'Potential multiplier', 'Domains', 'Lead (months)', 'Preparation starts (month)', 'KT setup', 'Annual cost', 'KT days avoided / year', 'KT value avoided', 'Extra savings (hub vs none)'],
    [...rows, ['Total', '', '', '', '', '', '', '', '', kt.totals.setup, kt.totals.annual, kt.totals.ktDays, kt.totals.ktAvoided, kt.totals.hubDeltaSav]],
    [undefined, undefined, undefined, undefined, undefined, '0.00', undefined, undefined, undefined, MONEY, MONEY, PCT, MONEY, MONEY]);
  const effects = waveEffects(pf, kt.rows), tot = waveEffectsTotal(effects);
  table(ws, 'Hub effect by wave', ['Wave', 'Products', 'Hub users', 'KT setup', 'Annual cost', 'KT value avoided', 'Extra savings (hub vs none)'],
    [...effects.map((w) => [w.name, w.products, w.users, w.setup, w.annual, w.ktAvoided, w.hubDeltaSav]), ['Total', tot.products, tot.users, '', '', '', tot.hubDeltaSav]], [undefined, undefined, undefined, MONEY, MONEY, MONEY, MONEY]);
  const infra = infraView(pf, kt.rows);
  table(ws, `Infrastructure allocation (${infra.mode})`, ['Product', 'Per month', 'Per year'], [...infra.shares.map((s) => [s.name, s.monthly, s.annual]), ['Sum of the shares', infra.sum, ''], ['Expected', infra.expected, ''], ['Conserved', infra.conserved ? 'Yes' : 'No', '']], [undefined, '#,##0.00', MONEY]);
  ws.getColumn(1).width = 46;
}
