/** @calc-zone delivery-views */
import { raciDiagnostics } from '../org/diagnostics';
import type { ActivityRaci, OrgDiagnostic } from '../org/types';
import { activityDef } from './catalogue';
import { programmeLaneId } from './ids';
import type { ProgrammeLane } from './model';
import type { WbsNode } from './wbs';

/**
 * The responsibility assignment matrix (docs/SPEC_BPMN.md § 19.8 F-B75; phase B9d): RAM = WBS work packages × OBS roles, with the RACI letters
 * of each programme activity (its lane Responsible, its Accountable, Consulted and Informed lanes, § 16) — the operating-model roles and the agents
 * of the OBS. The F-B36 checks of the organisation model (`raciDiagnostics`: no Responsible, several Accountable, no Accountable, unknown role)
 * run on every row and are shown on it. A view: the RACI is the programme's.
 */
export type RamLetter = 'R' | 'A' | 'C' | 'I';
/** A milestone or gate is signed off by the AI Office (§ 19.2: Design Authority with the AI Office's sign-off). */
export const MILESTONE_ACCOUNTABLE = 'aiOffice' as const;
export interface RamRow { code: string; name: string; activity: string; cells: Record<string, RamLetter[]>; findings: OrgDiagnostic[] }
export interface Ram { columns: { id: string; name: string }[]; rows: RamRow[] }

function raciOf(n: WbsNode): ActivityRaci {
  const t = n.task!, d = activityDef(t.kind), id = programmeLaneId;
  const raci = d ? { R: [id(d.lane)], A: d.raci.A && id(d.raci.A), C: d.raci.C.map(id), I: d.raci.I.map(id) }
    : { R: [id(t.lane)], A: id(MILESTONE_ACCOUNTABLE), C: [], I: [] };
  return { id: n.code, name: t.name, phase: '', type: t.milestone ? 'milestone' : 'task', inScope: true, effort: 0,
    raci: raci.A ? { ...raci, A: raci.A } : { R: raci.R, C: raci.C, I: raci.I },
    source: 'explicit', accountableToConfirm: false, accountables: raci.A ? 1 : 0, ...(t.lane === 'agents' ? { agent: id('agents') } : {}) };
}

export function programmeRam(w: readonly WbsNode[], lanes: readonly ProgrammeLane[]): Ram {
  const known = new Set(lanes.map((l) => l.id));
  const rows = w.filter((n) => n.task).map((n): RamRow => {
    const a = raciOf(n), cells: Record<string, RamLetter[]> = {};
    const put = (lane: string | undefined, l: RamLetter) => { if (lane) cells[lane] = [...(cells[lane] ?? []), l]; };
    a.raci.R.forEach((x) => put(x, 'R')); put(a.raci.A, 'A'); a.raci.C.forEach((x) => put(x, 'C')); a.raci.I.forEach((x) => put(x, 'I'));
    return { code: n.code, name: n.task!.name, activity: n.task!.activity, cells, findings: raciDiagnostics(a, known) };
  });
  return { columns: lanes.map((l) => ({ id: l.id, name: l.name })), rows };
}
