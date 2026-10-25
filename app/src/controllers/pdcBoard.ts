/** @calc-zone workspace-config */
import type { BoardCard, CardSlot, DynSection } from '@/domain/pdc/board';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

const list = (d: Doc): DynSection[] => ((d.dynamicSections ??= []) as DynSection[]);
const lists = (d: Doc): string[][] => Object.values((d.PERSONA_SECTIONS ?? {}) as Record<string, string[]>).filter(Array.isArray);

const addCmd = defineCommand<{ section: DynSection }>({
  type: 'board.addDashboard', label: (p) => `Generate the dashboard ${p.section.title}`,
  // reachable by every persona that carries an explicit list
  run(d, p) { list(d).push(p.section); lists(d).forEach((l) => { if (!l.includes(p.section.id)) l.push(p.section.id); }); },
});
const removeCmd = defineCommand<{ id: string; title: string }>({
  type: 'board.removeDashboard', label: (p) => `Remove the dashboard ${p.title}`,
  run(d, p) {
    const fix = (c: BoardCard) => {
      if (c.CARD_TARGET_SECTION === p.id) c.CARD_TARGET_SECTION = c.CARD_SOURCE_SECTION !== p.id ? c.CARD_SOURCE_SECTION : null;
      if (c.CARD_SOURCE_SECTION === p.id) { c.CARD_SOURCE_SECTION = null; c.CARD_IMPACT_VAR = c.CARD_KEY1_VAR = c.CARD_KEY2_VAR = null; }
    };
    list(d).filter((s) => s.id !== p.id).forEach((s) => s.cards.forEach(fix));
    lists(d).forEach((l) => { const i = l.indexOf(p.id); if (i >= 0) l.splice(i, 1); });
    d.dynamicSections = list(d).filter((s) => s.id !== p.id);
  },
});
const renameCmd = defineCommand<{ id: string; title: string }>({
  type: 'board.renameDashboard', label: (p) => `Rename a dashboard to ${p.title}`, run(d, p) {
    const s = list(d).find((x) => x.id === p.id);
    if (s && p.title.trim()) s.title = p.title.trim();
  },
});
const groupCmd = defineCommand<{ id: string; group: string }>({
  type: 'board.setDashboardGroup', label: (p) => `Move a dashboard to the group ${p.group}`, run(d, p) {
    const s = list(d).find((x) => x.id === p.id);
    if (s) s.menuGroup = p.group;
  },
});
const slotCmd = defineCommand<{ id: string; card: string; slot: CardSlot; variable: string | null }>({
  type: 'board.bindCardVariable', label: (p) => `Bind ${p.slot.replace('CARD_', '').replace('_VAR', '').toLowerCase()} of a card to ${p.variable ?? 'nothing'}`,
  run(d, p) { const c = list(d).find((x) => x.id === p.id)?.cards.find((x) => x.CARD_ID === p.card); if (c) c[p.slot] = p.variable || null; },
});
const nameCmd = defineCommand<{ id: string; card: string; name: string }>({
  type: 'board.renameCard', label: () => 'Rename a dashboard card', coalesceKey: (p) => `board.renameCard:${p.id}:${p.card}`,
  run(d, p) {
    const c = list(d).find((x) => x.id === p.id)?.cards.find((x) => x.CARD_ID === p.card);
    if (c) { c.CARD_NAME_SRC = 'static'; c.CARD_NAME_VALUE = p.name; }
  },
});

export const addDashboard = (section: DynSection): void => appStore().dispatch(addCmd({ section }));
export const removeDashboard = (id: string, title: string): void => appStore().dispatch(removeCmd({ id, title }));
export const renameDashboard = (id: string, title: string): void => appStore().dispatch(renameCmd({ id, title }));
export const setDashboardGroup = (id: string, group: string): void => appStore().dispatch(groupCmd({ id, group }));
export const bindCardVariable = (id: string, card: string, slot: CardSlot,
  variable: string | null): void => appStore().dispatch(slotCmd({ id, card, slot, variable }));
export const renameCard = (id: string, card: string, name: string): void => appStore().dispatch(nameCmd({ id, card, name }));
