/** @calc-zone workspace-config */
import type { MenuGroup } from '../pdc/personas';
import { bySeq, groupsByOrder, type NavSection, type PersonaOrder } from './layout';

/** New group and global order of one section. */
export interface Placement { id: string; group: string; groupSeq: number }

const STEP = 10;
const clamp = (i: number, n: number): number => Math.max(0, Math.min(n, i));
const byGlobal = (a: NavSection, b: NavSection): number => (a.groupSeq || 0) - (b.groupSeq || 0);

/**
 * Drop of a card on a group column (legacy pmlDrop): the section joins `group` at `index` among the others, every member of that group is
 * renumbered 10, 20, 30 …, and — when the group changed — so are the remaining sections of the group it left.
 */
export function placeSection(sections: NavSection[], id: string, group: string, index: number): Placement[] {
  const moved = sections.find((s) => s.id === id);
  if (!moved) return [];
  const ids = sections.filter((s) => s.group === group && s.id !== id).sort(byGlobal).map((s) => s.id);
  ids.splice(clamp(index, ids.length), 0, id);
  const out = ids.map((x, i) => ({ id: x, group, groupSeq: (i + 1) * STEP }));
  if (moved.group !== group) sections.filter((s) => s.group === moved.group && s.id !== id).sort(byGlobal).forEach((s, i) => out.push({ id: s.id, group: s.group, groupSeq: (i + 1) * STEP }));
  return out;
}

/** One position up (-1) or down (+1) inside its own group; empty when already at the end. */
export function shiftSection(sections: NavSection[], id: string, dir: -1 | 1): Placement[] {
  const s = sections.find((x) => x.id === id);
  if (!s) return [];
  const list = sections.filter((x) => x.group === s.group).sort(byGlobal), at = list.findIndex((x) => x.id === id), to = at + dir;
  return to < 0 || to >= list.length ? [] : placeSection(sections, id, s.group, to);
}

/** To the previous (-1) or next (+1) group in menu order, at its end. */
export function shiftToGroup(sections: NavSection[], groups: MenuGroup[], id: string, dir: -1 | 1): Placement[] {
  const s = sections.find((x) => x.id === id), order = groupsByOrder(groups), at = order.findIndex((g) => g.id === s?.group), target = order[at + dir];
  return !s || at < 0 || !target ? [] : placeSection(sections, id, target.id, Infinity);
}

/** Per-persona order of a group's members after `id` is dropped at `index`: every member gets 10, 20, 30 … (legacy pmaDrop; sparse override). */
export function placeForPersona(sections: NavSection[], persona: string, order: PersonaOrder, id: string, index: number): Record<string, number> {
  const s = sections.find((x) => x.id === id);
  if (!s) return {};
  const ids = sections.filter((x) => x.group === s.group && x.id !== id).sort(bySeq(persona, order)).map((x) => x.id);
  ids.splice(clamp(index, ids.length), 0, id);
  return Object.fromEntries(ids.map((x, i) => [x, (i + 1) * STEP]));
}

/** One position up or down in the persona's own order of the section's group. */
export function shiftForPersona(sections: NavSection[], persona: string, order: PersonaOrder, id: string, dir: -1 | 1): Record<string, number> {
  const s = sections.find((x) => x.id === id);
  if (!s) return {};
  const list = sections.filter((x) => x.group === s.group).sort(bySeq(persona, order)), to = list.findIndex((x) => x.id === id) + dir;
  return to < 0 || to >= list.length ? {} : placeForPersona(sections, persona, order, id, to);
}

/** New `order` values after moving a group one place in menu order (swap; equal or tied orders are renumbered 10, 20 …). Only changed groups. */
export function shiftGroup(groups: MenuGroup[], id: string, dir: -1 | 1): Record<string, number> {
  const list = groupsByOrder(groups), at = list.findIndex((g) => g.id === id), to = at + dir;
  if (at < 0 || to < 0 || to >= list.length) return {};
  const values = list.map((g) => g.order), ids = list.map((g) => g.id);
  [ids[at], ids[to]] = [ids[to]!, ids[at]!];
  const strict = values.every((v, i) => i === 0 || v > values[i - 1]!);
  const next = Object.fromEntries(ids.map((g, i) => [g, strict ? values[i]! : (i + 1) * STEP]));
  return Object.fromEntries(Object.entries(next).filter(([g, v]) => groups.find((x) => x.id === g)?.order !== v));
}

/** Respace ×10 Group Seq (legacy pmRespaceGroupSeq): in every group the sections get 10, 20, 30 … in their current order. Only changed ones. */
export function respaceGroupSeq(sections: NavSection[], step = STEP): Placement[] {
  const byGroup = new Map<string, NavSection[]>(), out: Placement[] = [];
  sections.forEach((s) => byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), s]));
  byGroup.forEach((list, group) => [...list].sort(byGlobal).forEach((s, i) => { if ((s.groupSeq || 0) !== (i + 1) * step) out.push({ id: s.id, group, groupSeq: (i + 1) * step }); }));
  return out;
}
