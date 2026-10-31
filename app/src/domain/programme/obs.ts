/** @calc-zone delivery-views */
import { unitTree } from '../org/model';
import type { OrgModel } from '../org/types';
import type { ProgrammeLane } from './model';

/**
 * The organisation breakdown structure (docs/SPEC_BPMN.md § 19.8 F-B75; phase B9d): the organisation model (§ 16, `domain/org`) as a tree —
 * units (in their hierarchy) → teams → roles (the team skills their lines provide, with FTE) — plus the transformation team (the operating-model
 * roles of the programme's lanes, with their Y1 FTE from the EV-09 topology) and the AI agents on a branch of their own (the agents of the role
 * catalogue and the programme's agents lane). Codes `1`, `1.1`, … in tree order. A view of the model: nothing is stored.
 */
export type ObsKind = 'organisation' | 'unit' | 'team' | 'role' | 'programmeRole' | 'agent' | 'branch';
export interface ObsNode {
  code: string; level: number; name: string; kind: ObsKind;
  /** FTE behind the node (a role line, an operating-model role in Y1, a team), null when none */
  fte: number | null;
  /** the programme lane of an operating-model role or of the agents (the RAM's column) */
  lane: string | null;
}

export function programmeObs(org: OrgModel, lanes: readonly ProgrammeLane[], name = 'Organisation'): ObsNode[] {
  const out: ObsNode[] = [{ code: '1', level: 1, name, kind: 'organisation', fte: null, lane: null }];
  const add = (code: string, level: number, n: string, kind: ObsKind, fte: number | null = null, lane: string | null = null) => {
    out.push({ code, level, name: n, kind, fte, lane });
    return code;
  };
  const tree = unitTree(org), roots = tree.filter((x) => x.depth === 0), childCount = new Map<string, number>();
  const unitCode = new Map<string, string>();
  let rootN = 0;
  for (const { unit, depth } of tree) {
    const parent = unit.parent && unitCode.get(unit.parent), k = parent ? (childCount.get(parent) ?? 0) + 1 : ++rootN;
    if (parent) childCount.set(parent, k);
    const code = add(parent ? `${parent}.${k}` : `1.${k}`, depth + 2, unit.name, 'unit');
    unitCode.set(unit.id, code);
    org.teams.filter((t) => t.unit === unit.id).forEach((t) => {
      const n = (childCount.get(code) ?? 0) + 1, tc = `${code}.${n}`, fte = t.lines.reduce((s, l) => s + (+l.etp || 0), 0);
      childCount.set(code, n);
      add(tc, depth + 3, t.name, 'team', fte);
      const skills = new Map<string, number>();
      for (const l of t.lines) skills.set(l.skill, (skills.get(l.skill) ?? 0) + (+l.etp || 0));
      [...skills].forEach(([s, f], i) => add(`${tc}.${i + 1}`, depth + 4, s, 'role', f));
    });
  }
  const tt = add(`1.${roots.length + 1}`, 2, 'Transformation team (operating-model roles)', 'branch');
  lanes.filter((l) => l.role !== 'agents').forEach((l, i) => add(`${tt}.${i + 1}`, 3, l.name, 'programmeRole', l.fteY1, l.id));
  const ag = add(`1.${roots.length + 2}`, 2, 'AI agents', 'branch'), agentsLane = lanes.find((l) => l.role === 'agents');
  if (agentsLane) add(`${ag}.1`, 3, agentsLane.name, 'agent', null, agentsLane.id);
  org.roles.filter((r) => r.kind === 'agent').forEach((r, i) => add(`${ag}.${i + 2}`, 3, r.name, 'agent'));
  return out;
}
