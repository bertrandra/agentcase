/** @calc-zone workspace-config */
import type { MenuGroup, PersonaSeq } from '../pdc/personas';
import { appOrder, bySeq, groupsByOrder, reachable, type NavSection, type PersonaLists, type PersonaOrder } from './layout';

/** One stop of the guided walk: the step it belongs to (index and label) and the section shown. */
export interface Stop { si: number; step: string; sec: string }

/** The persona's sequence when it is switched on and has at least one step (legacy wizSeq). */
export const activeSeq = (seq: PersonaSeq | undefined): PersonaSeq | null => (seq && seq.on && Array.isArray(seq.steps) && seq.steps.length ? seq : null);

/** Every section of every step in walking order (legacy wizFlatten). */
export const flatten = (seq: PersonaSeq): Stop[] => seq.steps.flatMap((st, si) => (st.sections ?? []).map((sec) => ({ si, step: st.label, sec })));

/**
 * One step per group the persona can reach (group order, then its section order); Welcome is left out (legacy pmGenSeqFromGroups). Null when nothing
 * is reachable.
 */
export function generateSeq(persona: string, sections: NavSection[], groups: MenuGroup[], lists: PersonaLists, order: PersonaOrder): PersonaSeq | null {
  const pool = reachable(persona, sections, lists).filter((s) => s.id !== 'home');
  const steps = groupsByOrder(groups)
    .map((g) => ({ label: g.label, sections: pool.filter((s) => s.group === g.id).sort(bySeq(persona, order)).map((s) => s.id) }))
    .filter((st) => st.sections.length > 0);
  return steps.length ? { on: true, steps } : null;
}

/**
 * Persona order that follows the sequence (legacy pmSyncSectionOrderToSeq): in every group the sequence touches, its sections get 1..N in first-occurrence
 * order and the group's other sections follow in their current order. Returns the entries to write and how many groups were touched.
 */
export function syncOrderToSeq(persona: string, seq: PersonaSeq, sections: NavSection[], order: PersonaOrder): { entries: Record<string, number>; ids: number; groups: number } {
  const seen = new Set<string>(), ordered: string[] = [];
  seq.steps.forEach((st) => (st.sections ?? []).forEach((id) => { if (!seen.has(id)) { seen.add(id); ordered.push(id); } }));
  const byGroup = new Map<string, string[]>();
  ordered.forEach((id) => { const s = sections.find((x) => x.id === id); if (s) byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), id]); });
  const entries: Record<string, number> = {};
  byGroup.forEach((seqIds, g) => {
    let n = 1;
    seqIds.forEach((id) => { entries[id] = n++; });
    sections.filter((s) => s.group === g && !seqIds.includes(s.id)).sort(bySeq(persona, order)).forEach((s) => { entries[s.id] = n++; });
  });
  return { entries, ids: ordered.length, groups: byGroup.size };
}

/** What "Sync menu to sequence" would change: the menu becomes Welcome + every known section of the sequence (legacy pmMembershipDiff). */
export function membershipDiff(seq: PersonaSeq, current: string[], sections: NavSection[]): { finalList: string[]; toAdd: string[]; toRemove: string[] } {
  const known = new Set(sections.map((s) => s.id)), ordered: string[] = [];
  seq.steps.forEach((st) => (st.sections ?? []).forEach((id) => { if (known.has(id) && id !== 'home' && !ordered.includes(id)) ordered.push(id); }));
  const finalList = ['home', ...ordered], keep = new Set(finalList);
  return { finalList, toAdd: finalList.filter((id) => !current.includes(id)), toRemove: current.filter((id) => !keep.has(id)) };
}

/** Respace (legacy pmRespaceOrders): the persona's assigned sections get step, 2*step … in the order the Assigned table shows. */
export function respaceOrders(persona: string, assigned: NavSection[], groups: MenuGroup[], order: PersonaOrder, step = 10): Record<string, number> {
  return Object.fromEntries(appOrder(persona, assigned, groups, order).map((s, i) => [s.id, (i + 1) * step]));
}
