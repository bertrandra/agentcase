/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import type { Plan, PlanBar } from './plan';

/**
 * The work breakdown structure of the programme (docs/SPEC_BPMN.md § 19.8 F-B74, decision D-B35; phase B9d), DERIVED from the plan (the
 * programme process): level 1 the programme, level 2 the engagement stages, each wave (a single case has one, "Rollout") and the programme's
 * assurance work, level 3 the product, level 4 the work package (an activity or a milestone of the product). Codes `1`, `1.2`, `1.2.3`,
 * `1.2.3.4` follow the tree in document order (the catalogue's order), deterministically; an optional override (`ac:wbsCode` in the BPMN
 * export, held by the case key `wbsCode-<activity kind>` until the stored form, phase B9c, and edited in the Process section's panel) replaces the
 * code of a work package that has one instance in the plan. A code that is not dotted digits is ignored.
 */
export type WbsKind = 'programme' | 'group' | 'product' | 'package';
export interface WbsNode {
  code: string; derived: string; level: number; name: string; kind: WbsKind;
  /** the bar of a work package; its product (null: case level) */
  task: PlanBar | null; productId: string | null;
  /** the override was applied, or ignored because it repeats another code */
  overridden: boolean; duplicate: boolean;
}
export const WBS_KEY = (kind: string): string => `wbsCode-${kind}`;
const CODE = /^\d+(\.\d+)*$/;
/** The override entered for an activity kind, or null. */
export function wbsOverride(c: Ctx, kind: string): string | null {
  const v = (c.inp.v(WBS_KEY(kind)) ?? '').trim();
  return CODE.test(v) ? v : null;
}

interface Group { name: string; kind: WbsKind; productId: string | null; tasks: PlanBar[]; children: Group[] }
const isStage = (t: PlanBar): boolean => t.kind.startsWith('stage-');

function tree(p: Plan): Group[] {
  const caseTasks = p.tasks.filter((t) => t.productId === null), groups: Group[] = [];
  const stages = caseTasks.filter(isStage), other = caseTasks.filter((t) => !isStage(t));
  if (stages.length) groups.push({ name: 'Engagement stages', kind: 'group', productId: null, tasks: stages, children: [] });
  const waves = new Map<string, Group>();
  for (const pr of p.products) {
    const key = pr.wave?.id ?? '', w = waves.get(key) ?? { name: pr.wave?.name ?? 'Rollout', kind: 'group' as const, productId: null, tasks: [], children: [] };
    if (!waves.has(key)) { waves.set(key, w); groups.push(w); }
    w.children.push({ name: pr.name, kind: 'product', productId: pr.id, tasks: p.tasks.filter((t) => t.productId === pr.id), children: [] });
  }
  if (other.length) groups.push({ name: 'Programme assurance and value', kind: 'group', productId: null, tasks: other, children: [] });
  return groups;
}

/** The WBS of a plan, flattened in document order (each node after its parent). */
export function programmeWbs(p: Plan): WbsNode[] {
  const out: WbsNode[] = [{ code: '1', derived: '1', level: 1, name: 'Transformation programme', kind: 'programme', task: null, productId: null,
    overridden: false, duplicate: false }];
  const count = new Map<string, number>();
  for (const t of p.tasks) count.set(t.kind, (count.get(t.kind) ?? 0) + 1);
  const seen = new Set<string>(['1']);
  const push = (n: Omit<WbsNode, 'overridden' | 'duplicate'>, kind?: string): WbsNode => {
    const o = kind && count.get(kind) === 1 ? wbsOverride(p.c, kind) : null, dup = o !== null && seen.has(o);
    const node = { ...n, code: o && !dup ? o : n.derived, overridden: !!o && !dup, duplicate: dup };
    seen.add(node.code); out.push(node);
    return node;
  };
  const visit = (g: Group, code: string, level: number): void => {
    const self = push({ code, derived: code, level, name: g.name, kind: g.kind, task: null, productId: g.productId });
    g.children.forEach((ch, i) => visit(ch, `${self.code}.${i + 1}`, level + 1));
    g.tasks.forEach((t, i) => {
      const d = `${self.code}.${g.children.length + i + 1}`;
      push({ code: d, derived: d, level: level + 1, name: t.name, kind: 'package', task: t, productId: t.productId }, t.kind);
    });
  };
  tree(p).forEach((g, i) => visit(g, `1.${i + 1}`, 2));
  return out;
}

/** The WBS code of each bar, by bar id. */
export const wbsCodes = (w: readonly WbsNode[]): Map<string, string> => new Map(w.filter((n) => n.task).map((n) => [n.task!.id, n.code]));
