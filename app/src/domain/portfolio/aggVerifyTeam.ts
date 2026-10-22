import { groupRows, locRows, targetTeam } from '../verifyA/targetTeam';
import { tobeComposition } from '../verifyA/tobe';
import { colOf, liveOf, productRows, sum, viewMemo, type VCol, type VTable } from './aggVerifyBase';

const TEAM: VCol[] = [
  { key: 'base', header: 'Input (FTE)', kind: 'n1' }, { key: 'dev', header: 'Target dev', kind: 'n1' }, { key: 'sup', header: 'Supervision', kind: 'n1' },
  { key: 'run', header: 'Agentic run', kind: 'n1' }, { key: 'recurring', header: 'Total recurring target', kind: 'n1' },
  { key: 'reduction', header: 'Net reduction', title: '1 - recurring target / input', kind: 'pct' }, { key: 'setup', header: 'Setup team (transitional)', kind: 'n1' },
];
export interface GroupAgg { group: string; composition: string; kind: string; fte: number; cost: number }
export interface LocAgg { name: string; cls: string; asisFte: number; asisPct: number; tgtFte: number; tgtPct: number }
export interface TargetTeamAgg { label: string; table: VTable; groups: GroupAgg[]; groupsTotal: { fte: number; cost: number }; locs: LocAgg[]; locsTotal: { asisFte: number; tgtFte: number } }

/** Target team (TO-BE) of a selection: the four poles and the location split of each product's target team, added up (FTE and annual cost are additive). */
export const targetTeamAgg = viewMemo((sel): TargetTeamAgg => {
  const parts = sel.items.map((v) => { const l = liveOf(v), t = targetTeam(l); return { t, groups: groupRows(l, t), locs: locRows(l, t) }; });
  const rows = productRows(sel, (v, l) => {
    const t = targetTeam(l), base = l.m.base.etp;
    return { base, dev: t.devETP, sup: t.supETP, run: t.runETP, recurring: t.totalRecurrent, reduction: base > 0 ? Math.round((1 - t.totalRecurrent / base) * 100) : null, setup: t.setupETP };
  });
  const base = sum(colOf(rows, 'base')), recurring = sum(colOf(rows, 'recurring'));
  const total = { base, dev: sum(colOf(rows, 'dev')), sup: sum(colOf(rows, 'sup')), run: sum(colOf(rows, 'run')), recurring, setup: sum(colOf(rows, 'setup')), reduction: base > 0 ? Math.round((1 - recurring / base) * 100) : null };
  const first = parts[0]?.groups ?? [];
  const groups = first.map((g, i) => ({ group: g.group, composition: g.composition, kind: g.kind, fte: sum(parts.map((p) => p.groups[i]!.fte)), cost: sum(parts.map((p) => p.groups[i]!.cost)) }));
  const tgt = sum(parts.flatMap((p) => p.locs.map((r) => r.tgtFte))), asis = sum(parts.flatMap((p) => p.locs.map((r) => r.asisFte)));
  const locs = (parts[0]?.locs ?? []).map((r, i) => {
    const a = sum(parts.map((p) => p.locs[i]!.asisFte)), g = sum(parts.map((p) => p.locs[i]!.tgtFte));
    return { name: r.name, cls: r.cls, asisFte: a, asisPct: asis > 0 ? (a / asis) * 100 : 0, tgtFte: g, tgtPct: tgt > 0 ? (g / tgt) * 100 : 0 };
  });
  return { label: sel.label, table: { columns: TEAM, rows, total }, groups, groupsTotal: { fte: sum(groups.map((g) => g.fte)), cost: sum(groups.map((g) => g.cost)) }, locs, locsTotal: { asisFte: asis, tgtFte: tgt } };
});

const TOBE: VCol[] = [
  { key: 'asis', header: 'AS-IS FTE', kind: 'n2' }, { key: 'human', header: 'TO-BE human FTE', kind: 'n2' }, { key: 'agent', header: 'TO-BE agent vFTE', kind: 'n2' },
  { key: 'modelHuman', header: 'Model human FTE', title: 'Aggregate model, same year: the skills reconcile to it', kind: 'n2' }, { key: 'modelAgent', header: 'Model agent vFTE', kind: 'n2' },
];
export interface SkillAgg { skill: string; asis: number; human: number; agent: number; autoPct: number }
export interface TobeTeamAgg { label: string; /** 0-based year shown (clamped to the longest horizon of the selection) */ year: number; years: number; skills: SkillAgg[]; total: { asis: number; human: number; agent: number }; table: VTable }

/** TO-BE team of a selection by skill for year index `year`: the products' residual human FTE and agent vFTE per skill, added up (a product is read at its last year when shorter). */
export const tobeTeamAgg = viewMemo((sel, _pf, year: number): TobeTeamAgg => {
  const comps = sel.items.map((v) => tobeComposition(liveOf(v), year)), years = Math.max(1, ...comps.map((c) => c.years.length)), y = Math.min(year, years - 1);
  const at = (c: (typeof comps)[number]) => Math.min(y, c.years.length - 1);
  const names = [...new Set(comps.flatMap((c) => c.rows.map((r) => r.skill)))].sort();
  const skills = names.map((skill) => {
    const rs = comps.flatMap((c) => c.rows.filter((r) => r.skill === skill).map((r) => ({ asis: r.asisFTE, ...r.perYear[at(c)]! })));
    const asis = sum(rs.map((r) => r.asis)), agent = sum(rs.map((r) => r.agent));
    return { skill, asis, human: sum(rs.map((r) => r.human)), agent, autoPct: asis > 0 ? Math.min(100, (agent / asis) * 100) : 0 };
  });
  const rows = productRows(sel, (v, l) => {
    const c = comps[sel.items.indexOf(v)]!, e = l.eng.years()[at(c)]!;
    return { asis: c.tot.asis, human: c.tot.human, agent: c.tot.agent, modelHuman: e.humanFteEnd, modelAgent: e.agentVfteEnd };
  });
  const total = { asis: sum(comps.map((c) => c.tot.asis)), human: sum(comps.map((c) => c.tot.human)), agent: sum(comps.map((c) => c.tot.agent)) };
  return { label: sel.label, year: y, years, skills, total, table: { columns: TOBE, rows, total: { ...total, modelHuman: sum(colOf(rows, 'modelHuman')), modelAgent: sum(colOf(rows, 'modelAgent')) } } };
});
