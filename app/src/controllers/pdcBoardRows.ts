import type { BoardCard, BoardRow, DynSection } from '@/domain/pdc/board';
import { bindable, moveRow, newCard, newRow } from '@/domain/pdc/boardRows';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

const sec = (d: Doc, id: string): DynSection | undefined => ((d.dynamicSections ?? []) as DynSection[]).find((s) => s.id === id);
const rowOf = (d: Doc, id: string, row: string): BoardRow | undefined => sec(d, id)?.rows?.find((r) => r.id === row);
const cardOf = (d: Doc, id: string, card: string): BoardCard | undefined => sec(d, id)?.cards.find((c) => c.CARD_ID === card);

export type RowField = 'label' | 'var' | 'format' | 'defaultValue';
export type CardField = 'CARD_ENABLED' | 'CARD_SEQ' | 'CARD_TARGET_SECTION' | 'CARD_OVERLAY_CTRL' | 'CARD_IMPACT_FMT' | 'CARD_KEY1_FMT' | 'CARD_KEY2_FMT' | 'CARD_KEY1_LABEL' | 'CARD_KEY2_LABEL';

const descCmd = defineCommand<{ id: string; text: string }>({
  type: 'board.setDescription', label: () => 'Edit the description of a dashboard', coalesceKey: (p) => `board.setDescription:${p.id}`,
  run(d, p) { const s = sec(d, p.id); if (s) s.description = p.text; },
});
const addRowCmd = defineCommand<{ id: string }>({
  type: 'board.addRow', label: () => 'Add a body row to a dashboard',
  run(d, p) { const s = sec(d, p.id); if (s) (s.rows ??= []).push(newRow(p.id, s.rows)); },
});
const removeRowCmd = defineCommand<{ id: string; row: string; label: string }>({
  type: 'board.removeRow', label: (p) => `Remove the body row ${p.label}`,
  run(d, p) { const s = sec(d, p.id); if (s) s.rows = (s.rows ?? []).filter((r) => r.id !== p.row); },
});
const moveRowCmd = defineCommand<{ id: string; row: string; dir: -1 | 1 }>({
  type: 'board.moveRow', label: (p) => `Move a body row ${p.dir < 0 ? 'up' : 'down'}`,
  run(d, p) { const s = sec(d, p.id); if (s?.rows) moveRow(s.rows, p.row, p.dir); },
});
const rowSeqCmd = defineCommand<{ id: string; row: string; seq: number }>({
  type: 'board.setRowSeq', label: () => 'Set the order of a body row', coalesceKey: (p) => `board.setRowSeq:${p.id}:${p.row}`,
  run(d, p) { const r = rowOf(d, p.id, p.row); if (r && !isNaN(p.seq)) r.seq = p.seq; },
});
const rowFieldCmd = defineCommand<{ id: string; row: string; field: RowField; value: string }>({
  type: 'board.setRowField', label: (p) => `Edit the ${p.field === 'defaultValue' ? 'default' : p.field} of a body row`,
  coalesceKey: (p) => `board.setRowField:${p.id}:${p.row}:${p.field}`,
  run(d, p) {
    const r = rowOf(d, p.id, p.row); if (!r) return;
    if (p.field === 'label') r.label = p.value; else if (p.field === 'defaultValue') r.defaultValue = p.value; else r[p.field] = p.value || null;
  },
});
const rowSourceCmd = defineCommand<{ id: string; row: string; source: string }>({
  type: 'board.setRowSource', label: () => 'Set the source section of a body row',
  run(d, p) { const r = rowOf(d, p.id, p.row); if (r) { r.source = p.source; if (!bindable(p.source, r.var)) r.var = null; } },   // a variable the new source does not offer is unbound
});
const addCardCmd = defineCommand<{ id: string }>({
  type: 'board.addCard', label: () => 'Add a card to a dashboard',
  run(d, p) { const s = sec(d, p.id); if (s) s.cards.push(newCard(p.id, s.cards)); },
});
const removeCardCmd = defineCommand<{ id: string; card: string; name: string }>({
  type: 'board.removeCard', label: (p) => `Remove the card ${p.name}`,
  run(d, p) { const s = sec(d, p.id); if (s) s.cards = s.cards.filter((c) => c.CARD_ID !== p.card); },
});
const cardFieldCmd = defineCommand<{ id: string; card: string; field: CardField; value: string | number | boolean }>({
  type: 'board.setCardField', label: (p) => `Edit ${p.field.replace('CARD_', '').toLowerCase().replace('_', ' ')} of a dashboard card`,
  coalesceKey: (p) => `board.setCardField:${p.id}:${p.card}:${p.field}`,
  run(d, p) {
    const c = cardOf(d, p.id, p.card);
    if (!c) return;
    if (p.field === 'CARD_ENABLED') c.CARD_ENABLED = !!p.value;
    else if (p.field === 'CARD_SEQ') { const n = Number(p.value); c.CARD_SEQ = isNaN(n) ? 0 : n; } else (c as unknown as Record<string, unknown>)[p.field] = p.value === '' ? null : p.value;
  },
});
const cardSourceCmd = defineCommand<{ id: string; card: string; source: string }>({
  type: 'board.setCardSource', label: () => 'Set the source section of a dashboard card',
  run(d, p) {
    const c = cardOf(d, p.id, p.card); if (!c) return;
    c.CARD_SOURCE_SECTION = p.source;
    (['CARD_IMPACT_VAR', 'CARD_KEY1_VAR', 'CARD_KEY2_VAR'] as const).forEach((f) => { if (!bindable(p.source, c[f])) c[f] = null; });
  },
});

export const setDescription = (id: string, text: string): void => appStore().dispatch(descCmd({ id, text }));
export const addRow = (id: string): void => appStore().dispatch(addRowCmd({ id }));
export const removeRow = (id: string, row: string, label: string): void => appStore().dispatch(removeRowCmd({ id, row, label }));
export const moveBodyRow = (id: string, row: string, dir: -1 | 1): void => appStore().dispatch(moveRowCmd({ id, row, dir }));
export const setRowSeq = (id: string, row: string, seq: number): void => appStore().dispatch(rowSeqCmd({ id, row, seq }));
export const setRowField = (id: string, row: string, field: RowField, value: string): void => appStore().dispatch(rowFieldCmd({ id, row, field, value }));
export const setRowSource = (id: string, row: string, source: string): void => appStore().dispatch(rowSourceCmd({ id, row, source }));
export const addCard = (id: string): void => appStore().dispatch(addCardCmd({ id }));
export const removeCard = (id: string, card: string, name: string): void => appStore().dispatch(removeCardCmd({ id, card, name }));
export const setCardField = (id: string, card: string, field: CardField, value: string | number | boolean): void => appStore().dispatch(cardFieldCmd({ id, card, field, value }));
export const setCardSource = (id: string, card: string, source: string): void => appStore().dispatch(cardSourceCmd({ id, card, source }));
