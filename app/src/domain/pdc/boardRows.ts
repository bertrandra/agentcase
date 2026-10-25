/** @calc-zone workspace-config */
import type { BoardCard, BoardRow } from './board';
import { variablesForSection } from './variables';

/** Overlay controls a card can bind its active state to (legacy OVERLAY_CONTROLS: the app's "apply this overlay" checkboxes). */
export const OVERLAY_CONTROLS: { id: string; label: string }[] = [
  { id: 'khEnabled', label: 'Knowledge hub' }, { id: 'vtaxApply', label: 'Verification tax' }, { id: 'qualApply', label: 'AI code-quality premium' },
  { id: 'loopExternalApply', label: 'External rework (Loop Pairs)' }, { id: 'loopInternalApply', label: 'Internal loop (Loop Pairs)' },
  { id: 'pillarApply', label: 'Pillar leverage' }, { id: 'riskApply', label: 'Risk register → DI' }, { id: 'aiActApply', label: 'AI-Act tier → DI' },
];

/** Rows in display order (by seq, ties and missing seq keep their stored order). */
export const sortedRows = (rows: readonly BoardRow[]): BoardRow[] => rows.map((r, i) => ({ r, i })).sort((a,
  b) => (a.r.seq || 0) - (b.r.seq || 0) || a.i - b.i).map((x) => x.r);
export const sortedCards = (cards: readonly BoardCard[]): BoardCard[] => cards.map((r, i) => ({ r, i })).sort((a,
  b) => (a.r.CARD_SEQ || 0) - (b.r.CARD_SEQ || 0) || a.i - b.i).map((x) => x.r);

/** `prefix-<n>` with the smallest n (from `from`) no id of the list uses: ids stay unique and a replay creates the same one. */
export function freshId(prefix: string, taken: readonly (string | undefined)[], from: number): string {
  let n = from;
  while (taken.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** A new body row (legacy dynRowAdd): last in order, unbound, format "(auto)". */
export function newRow(sectionId: string, rows: readonly BoardRow[]): BoardRow {
  return { id: freshId('row-', rows.map((r) => r.id), rows.length + 1), seq: rows.reduce((m, r) => Math.max(m, r.seq || 0), 0) + 1, label: 'New row',
    var: null, source: sectionId, format: null, defaultValue: '' };
}

/** A new card (legacy dynCardAdd): last in order, switched off, no variable bound. */
export function newCard(sectionId: string, cards: readonly BoardCard[]): BoardCard {
  return { CARD_ID: freshId(`card-${sectionId}-`, cards.map((c) => c.CARD_ID), cards.length + 1),
  CARD_SEQ: cards.reduce((m, c) => Math.max(m, c.CARD_SEQ || 0), 0) + 1, CARD_ENABLED: false,
    CARD_SOURCE_SECTION: sectionId, CARD_TARGET_SECTION: sectionId, CARD_NAME_SRC: 'static', CARD_NAME_VALUE: 'New card', CARD_IMPACT_VAR: null,
    CARD_IMPACT_FMT: null,
    CARD_KEY1_VAR: null, CARD_KEY1_FMT: null, CARD_KEY1_LABEL: null, CARD_KEY2_VAR: null, CARD_KEY2_FMT: null, CARD_KEY2_LABEL: null, CARD_OVERLAY_CTRL: null };
}

/** Is `variable` offered for cards / rows whose Source is `source` (that section's own variables plus the GLOBAL ones)? */
export const bindable = (source: string | null | undefined,
  variable: string | null | undefined): boolean => !variable || variablesForSection(source ?? '').some((v) => v.id === variable);

/** Swap a row with its neighbour in display order. The order is first made explicit (seq 1..n), so equal or missing seq values cannot block the move. */
export function moveRow(rows: BoardRow[], id: string, dir: -1 | 1): void {
  const order = sortedRows(rows), i = order.findIndex((r) => r.id === id), j = i + dir;
  order.forEach((r, k) => { r.seq = k + 1; });
  if (i < 0 || j < 0 || j >= order.length) return;
  const a = order[i]!, b = order[j]!;
  a.seq = j + 1; b.seq = i + 1;
}
