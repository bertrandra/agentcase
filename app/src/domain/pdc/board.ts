/** @calc-zone workspace-config */
import { VARIABLES } from './variables';

export interface BoardCard {
  CARD_ID: string; CARD_SEQ: number; CARD_ENABLED: boolean; CARD_SOURCE_SECTION: string | null; CARD_TARGET_SECTION: string | null;
  CARD_NAME_SRC: 'static' | 'var'; CARD_NAME_VALUE: string; CARD_IMPACT_VAR: string | null; CARD_IMPACT_FMT: string | null;
  CARD_KEY1_VAR: string | null; CARD_KEY1_FMT: string | null; CARD_KEY1_LABEL: string | null;
  CARD_KEY2_VAR: string | null; CARD_KEY2_FMT: string | null; CARD_KEY2_LABEL: string | null; CARD_OVERLAY_CTRL: string | null;
}
/**
 * A body row of a dashboard: a label and a registry variable of `source` (its default text shows while unbound). `id` is absent on rows imported from
 * old files.
 */
export interface BoardRow { id?: string; label: string; var?: string | null; source?: string | null; format?: string | null; defaultValue?: unknown; seq?: number }
export interface DynSection { id: string; title: string; archetype: string; description: string; menuGroup: string; order: number; visible: boolean; cards: BoardCard[]; rows: BoardRow[] }
export type CardSlot = 'CARD_IMPACT_VAR' | 'CARD_KEY1_VAR' | 'CARD_KEY2_VAR';
export interface SectionRef { id: string; group: string; label: string }

const GLOBALS = VARIABLES.filter((x) => x.scope === 'GLOBAL').map((x) => x.id);
const g = (i: number): string | null => GLOBALS[i] ?? GLOBALS[0] ?? null;

function mk(secId: string, n: number, name: string, source: string, target: string, iv: string | null, k1: string | null, k2: string | null): BoardCard {
  return { CARD_ID: `card-${secId}-${n}`, CARD_SEQ: n, CARD_ENABLED: true, CARD_SOURCE_SECTION: source, CARD_TARGET_SECTION: target, CARD_NAME_SRC: 'static', CARD_NAME_VALUE: name,
    CARD_IMPACT_VAR: iv, CARD_IMPACT_FMT: null, CARD_KEY1_VAR: k1, CARD_KEY1_FMT: null, CARD_KEY1_LABEL: null, CARD_KEY2_VAR: k2, CARD_KEY2_FMT: null, CARD_KEY2_LABEL: null, CARD_OVERLAY_CTRL: null };
}

/**
 * Cards of a generated dashboard: two GLOBAL headline cards, then two per section that owns bindable variables (sections of the selected
 * groups, or all), padded from the GLOBAL set. `sections` is the live section catalogue.
 */
export function buildGroupCards(secId: string, groupIds: string[], allGroups: boolean, sections: SectionRef[]): BoardCard[] {
  let n = 1;
  const cards = [mk(secId, n++, 'Headlines · Savings', secId, 'financial', g(2), g(3), g(8)), mk(secId, n++, 'Headlines · Verdict', secId, 'results', g(9), g(7), g(14))];
  const by = new Map<string, SectionRef>(sections.map((s) => [s.id, s])), byScope = new Map<string, string[]>();
  for (const x of VARIABLES) {
    const sec = by.get(x.scope);
    if (x.scope === 'GLOBAL' || !sec || (!allGroups && !groupIds.includes(sec.group))) continue;
    byScope.set(x.scope, [...(byScope.get(x.scope) ?? []), x.id]);
  }
  const label = (id: string) => by.get(id)?.label ?? id;
  for (const scope of [...byScope.keys()].sort((a, b) => label(a).localeCompare(label(b)))) {
    const vs = byScope.get(scope)!;
    cards.push(mk(secId, n++, `${label(scope)} · A`, scope, scope, vs[0] ?? g(2), vs[1] ?? g(3), vs[2] ?? g(8)));
    cards.push(mk(secId, n++, `${label(scope)} · B`, scope, scope, vs[3] ?? g(9), vs[4] ?? g(7), vs[5] ?? g(14)));
  }
  return cards;
}

/** Display name of a generated dashboard's group list ("Tune + Verify"): numbering and emoji prefixes stripped. */
export const plainGroupLabel = (label: string): string => label.replace(/^[0-9]+\s*·\s*/, '').replace(/^\S+\s+/, '');

/** A new dashboard from a group selection (legacy dynSectionGenerate); `existing` are the ids already taken. */
export function newDashboard(opts: { groupIds: string[]; allGroups: boolean; existing: string[]; groups: { id: string; label: string }[]; sections: SectionRef[]; maxOrder: number }): DynSection | null {
  const { groupIds, allGroups, existing, groups, sections, maxOrder } = opts;
  if (!allGroups && !groupIds.length) return null;
  const stub = allGroups ? 'dyn-allgroups' : 'dyn-groups';
  let n = 1; while (existing.includes(`${stub}-${n}`)) n++;
  const id = `${stub}-${n}`, labels = allGroups ? [] : groupIds.map((gid) => { const gr = groups.find((x) => x.id === gid); return gr ? plainGroupLabel(gr.label) : gid; });
  const title = (allGroups ? 'Dashboard — All groups' : `Dashboard — ${labels.join(' + ')}`) + (n > 1 ? ` ${n}` : '');
  const description = `Auto-generated: 2 cards per section that owns a bindable variable, ${allGroups ? 'across every menu group' : `from ${labels.join(', ')}`}.`;
  return { id, title, archetype: allGroups ? 'ALL' : `GROUPS:${groupIds.join(',')}`, description, menuGroup: !allGroups && groupIds.length === 1 ? groupIds[0]! : 'configure',
    order: maxOrder + 1, visible: true, cards: buildGroupCards(id, groupIds, allGroups, sections), rows: [] };
}
