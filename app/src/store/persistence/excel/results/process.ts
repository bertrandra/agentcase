/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { hasCustomProcess, type ProcessSummary } from '@/domain/verifyA/processSummary';
import { head } from './style';

const yes = (b: boolean): string => (b ? 'Yes' : 'No');
const pct = (x: number): number => Math.round(x * 1000) / 10;
const f2 = (x: number): number => Math.round(x * 100) / 100;

/**
 * Process sheet (spec F-B22, B5): the activities × actors × parameters the engine read, then the actors and the rework loops of the case's process.
 * Written only when the process holds custom content (activities, roles, agents or rework boundary events the catalogue does not): the workbook of
 * a catalogue case stays the legacy one, sheet for sheet.
 */
export function processSheet(wb: Workbook, p: ProcessSummary, name = 'Process'): void {
  if (!hasCustomProcess(p)) return;
  const ws = wb.addWorksheet(name);
  ws.addRow(['Phase', 'Activity', 'Name', 'Type', 'Custom', 'Regulatory', 'In scope', 'Role', 'Team skill', 'Agent', 'Effort', 'Weight (w)', 'Value class',
    'AI authority', 'Human %', 'Agent %']);
  for (const a of p.activities) {
    ws.addRow([a.phase, a.id, a.name, a.type, yes(a.custom), yes(a.regulatory), yes(a.inScope), a.role, a.teamSkill, a.agent, a.effort, f2(a.w), a.value,
      a.aiAuth, a.humanSup, a.agentSup]);
  }
  head(ws);
  ws.addRow([]);
  ws.addRow(['Actor', 'Name', 'Kind', 'Team skill', 'Capability', 'Custom', 'Activities']).font = { bold: true };
  for (const r of p.actors) ws.addRow([r.id, r.name, r.kind, r.teamSkill, r.capability, yes(r.custom), r.activities]);
  ws.addRow([]);
  ws.addRow(['Rework loop', 'Label', 'From phase', 'To phase', 'Probability %', 'Cost share %', 'Added weight (w)', 'Boundary event']).font = { bold: true };
  for (const l of p.loops) ws.addRow([l.id, l.label, l.from, l.to, pct(l.probability), pct(l.costShare), f2(l.addedW), yes(l.boundary)]);
}
