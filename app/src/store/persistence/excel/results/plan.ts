/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { fteOf } from '@/domain/programme/histogram';
import type { PlanViews } from '@/domain/programme/planBundle';
import { head } from './style';

const f2 = (x: number): number => Math.round(x * 100) / 100;
export const PLAN_SHEET_NAMES = ['WBS', 'WBS dictionary', 'OBS', 'RAM', 'Histogram'] as const;
const NOTE = 'Derived from the AgentCase transformation programme (BPMN): a documented mapping, not a standard conversion (SPEC_BPMN § 19.8).';

/**
 * The plan sheets of the results workbook (docs/SPEC_BPMN.md § 19.8 F-B77; phase B9d): WBS, WBS dictionary, OBS, RAM and Histogram, from the
 * plan views of a display scope (`planViews`, the views the 📅 Plan screen shows). Added after the case sheets only when the export asks for
 * them (the Plan screen's "Results workbook with the plan sheets"): the default Financial workbook stays the legacy one, sheet for sheet.
 */
export function planSheets(wb: Workbook, v: PlanViews): void {
  const wbs = wb.addWorksheet('WBS');
  wbs.addRow(['Code', 'Derived code', 'Level', 'Element', 'Kind', 'Code entered']);
  for (const n of v.wbs) wbs.addRow([n.code, n.derived, n.level, `${'  '.repeat(n.level - 1)}${n.name}`, n.task?.milestone ? 'milestone' : n.kind,
    n.overridden ? 'Yes' : '']);
  head(wbs); wbs.addRow([]); wbs.addRow([NOTE]);
  const d = wb.addWorksheet('WBS dictionary');
  d.addRow(['Code', 'Work package', 'Description', 'Deliverable', 'Accountable', 'Roles', 'Effort (days)', 'Cost (EUR)', 'Cost basis', 'Duration (months)',
    'Start', 'Finish', 'Predecessors', 'Critical']);
  for (const r of v.dictionary) d.addRow([r.code, r.name, r.description, r.deliverable, r.accountable, r.roles, r.effortDays === null ? '' : f2(r.effortDays),
    r.cost === null ? '' : f2(r.cost), r.costPer ? `${r.costRule} (${r.costPer})` : r.costRule, r.milestone ? 0 : r.months, r.start, r.finish, r.predecessors,
    r.critical ? 'Yes' : '']);
  head(d);
  const o = wb.addWorksheet('OBS');
  o.addRow(['Code', 'Level', 'Element', 'Kind', 'FTE']);
  for (const n of v.obs) o.addRow([n.code, n.level, `${'  '.repeat(n.level - 1)}${n.name}`, n.kind, n.fte === null ? '' : f2(n.fte)]);
  head(o);
  const ram = wb.addWorksheet('RAM');
  ram.addRow(['WBS', 'Work package', ...v.ram.columns.map((c) => c.name), 'Checks (F-B36)']);
  for (const r of v.ram.rows) ram.addRow([r.code, r.name, ...v.ram.columns.map((c) => (r.cells[c.id] ?? []).join(', ')),
    r.findings.map((f) => f.message).join('; ') || 'OK']);
  head(ram);
  const h = wb.addWorksheet('Histogram'), hist = v.histogram;
  h.addRow(['Month', ...hist.roles.map((r) => `${r.label} (FTE)`), 'Total (FTE)', 'Total (person-days)', 'Capacity (FTE)']);
  const cap = hist.roles.reduce((s, r) => s + (r.capacity ?? 0), 0);
  for (let i = 0; i <= hist.to - hist.from; i++) {
    const days = hist.roles.reduce((s, r) => s + r.days[i]!, 0);
    if (days <= 1e-9) continue;
    h.addRow([hist.from + i, ...hist.roles.map((r) => f2(fteOf(r.days[i]!, hist.wdMonth))), f2(fteOf(days, hist.wdMonth)), f2(days), f2(cap)]);
  }
  head(h); h.addRow([]);
  for (const f of hist.flags) h.addRow([`Over-allocated: ${f.label}, month ${f.month}`, f2(f.fte), 'capacity', f2(f.capacity)]);
}
