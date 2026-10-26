import type { Ctx } from '@/domain';
import type { BoardCard, BoardRow, DynSection } from '@/domain/pdc/board';
import { sortedCards, sortedRows } from '@/domain/pdc/boardRows';
import { NO_RUNTIME, variableById, type VarRuntime } from '@/domain/pdc/variables';
import { formatValue } from './format';

type Slot = 'CARD_IMPACT' | 'CARD_KEY1' | 'CARD_KEY2';

/** Live value of a card slot: the bound variable in its (overridden) format, or null when unbound or not computable. */
export function slotValue(c: Ctx, card: BoardCard, slot: Slot, rt: VarRuntime = NO_RUNTIME): string | null {
  const v = variableById(card[`${slot}_VAR` as 'CARD_IMPACT_VAR']);
  if (!v) return null;
  try { return formatValue(v.get(c, rt), card[`${slot}_FMT` as 'CARD_IMPACT_FMT'] || v.format); } catch { return null; }
}
export function cardName(c: Ctx, card: BoardCard, rt: VarRuntime = NO_RUNTIME): string {
  const v = card.CARD_NAME_SRC === 'var' && card.CARD_NAME_VALUE ? variableById(card.CARD_NAME_VALUE) : undefined;
  if (v) { try { return formatValue(v.get(c, rt), v.format); } catch { /* fall through to the static name */ } }
  return card.CARD_NAME_VALUE || card.CARD_ID;
}
const keyLabel = (card: BoardCard, k: 'CARD_KEY1' | 'CARD_KEY2'): string | null =>
  card[`${k}_LABEL` as 'CARD_KEY1_LABEL'] || variableById(card[`${k}_VAR` as 'CARD_KEY1_VAR'])?.label || null;

/** What a body row shows: its variable in the row's format (else the variable's own), or its default text when unbound or not computable. */
export function rowDisplay(c: Ctx, row: BoardRow, rt: VarRuntime = NO_RUNTIME): string {
  const v = variableById(row.var);
  if (v) { try { return formatValue(v.get(c, rt), row.format || v.format); } catch { /* shows the default */ } }
  return formatValue(row.defaultValue, row.format);
}

export interface CardModel { id: string; name: string; impact: string | null; keys: { label: string | null; value: string }[]; target: string | null }
export interface RowModel { id: string; label: string; display: string }
export interface DynamicSectionModel { id: string; title: string; description: string; cards: CardModel[]; rows: RowModel[] }

/** One card as it displays: name, headline, up to two labelled key figures and the section it opens (the target, else the source). */
export function cardModel(c: Ctx, card: BoardCard, rt: VarRuntime = NO_RUNTIME): CardModel {
  const keys = (['CARD_KEY1', 'CARD_KEY2'] as const).map((k) => ({ label: keyLabel(card, k), value: slotValue(c, card, k, rt) }))
    .filter((k): k is { label: string | null; value: string } => k.value != null);
  return { id: card.CARD_ID, name: cardName(c, card, rt), impact: slotValue(c, card, 'CARD_IMPACT', rt), keys,
    target: card.CARD_TARGET_SECTION || card.CARD_SOURCE_SECTION || null };
}

/**
 * A stored dynamic section as its own tab shows it (legacy renderDynamicSectionBody): the cards in seq order and the body rows in seq order,
 * every value computed live from the case. Every card is shown whatever its On flag says, like the legacy results view.
 */
export function renderDynamicSection(section: DynSection, c: Ctx, rt: VarRuntime = NO_RUNTIME): DynamicSectionModel {
  return {
    id: section.id, title: section.title, description: section.description,
    cards: sortedCards(section.cards ?? []).map((card) => cardModel(c, card, rt)),
    rows: sortedRows(section.rows ?? []).map((r, i) => ({ id: r.id ?? `row-${i}`, label: String(r.label ?? ''), display: rowDisplay(c, r, rt) })),
  };
}
