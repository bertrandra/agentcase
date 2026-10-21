import { bindCardVariable, renameCard } from '@/controllers/pdcBoard';
import { addCard, removeCard, setCardField, setCardSource } from '@/controllers/pdcBoardRows';
import type { BoardCard, CardSlot, DynSection } from '@/domain/pdc/board';
import { sortedCards } from '@/domain/pdc/boardRows';
import { variableById } from '@/domain/pdc/variables';
import { OverlayPicker, SectionPicker, VarPicker } from './pickers';

const SLOTS: [CardSlot, string][] = [['CARD_IMPACT_VAR', 'Headline'], ['CARD_KEY1_VAR', 'Key figure 1'], ['CARD_KEY2_VAR', 'Key figure 2']];

/** A key-figure slot: its variable plus the label shown beside the value (the variable's own label while empty). */
function KeySlot({ id, card, slot, title }: { id: string; card: BoardCard; slot: 'CARD_KEY1_VAR' | 'CARD_KEY2_VAR'; title: string }) {
  const lab = slot === 'CARD_KEY1_VAR' ? 'CARD_KEY1_LABEL' : 'CARD_KEY2_LABEL';
  return (
    <>
      <VarPicker source={card.CARD_SOURCE_SECTION} value={card[slot]} label={`${title} of ${card.CARD_ID}`} onChange={(v) => bindCardVariable(id, card.CARD_ID, slot, v)} />
      <input type="text" aria-label={`${title} label of ${card.CARD_ID}`} placeholder={variableById(card[slot])?.label ?? 'label'} value={card[lab] ?? ''} onChange={(e) => setCardField(id, card.CARD_ID, lab, e.target.value)} />
    </>
  );
}

/** The cards of a dashboard: order, on/off, name, source section (decides the variables on offer), the three slots, overlay and target. */
export function CardsEditor({ section }: { section: DynSection }) {
  const id = section.id;
  return (
    <>
      <h4>Cards <span className="ac-muted">— {section.cards.length}</span></h4>
      <p className="ac-muted">Set Source first — it decides which variables Headline / Key figure 1 / Key figure 2 can pick from.</p>
      <div className="ac-table-wrap"><table className="ac-table">
        <caption className="sr-only">Cards of {section.title}</caption>
        <thead><tr><th>Seq</th><th>On</th><th>Name</th><th>Source</th><th>{SLOTS[0]![1]}</th><th>{SLOTS[1]![1]}</th><th>{SLOTS[2]![1]}</th><th>Overlay</th><th>Target (goto)</th><th /></tr></thead>
        <tbody>
          {section.cards.length === 0 && <tr><td colSpan={10} className="ac-muted">No cards.</td></tr>}
          {sortedCards(section.cards).map((card) => (
            <tr key={card.CARD_ID}>
              <td><input type="number" aria-label={`Order of ${card.CARD_ID}`} style={{ width: 56 }} value={card.CARD_SEQ || 0} onChange={(e) => setCardField(id, card.CARD_ID, 'CARD_SEQ', e.target.value)} /></td>
              <td><input type="checkbox" aria-label={`On ${card.CARD_ID}`} checked={!!card.CARD_ENABLED} onChange={(e) => setCardField(id, card.CARD_ID, 'CARD_ENABLED', e.target.checked)} /></td>
              <td><input type="text" aria-label={`Name of ${card.CARD_ID}`} value={card.CARD_NAME_VALUE} onChange={(e) => renameCard(id, card.CARD_ID, e.target.value)} /></td>
              <td><SectionPicker value={card.CARD_SOURCE_SECTION} label={`Source of ${card.CARD_ID}`} onChange={(v) => v && setCardSource(id, card.CARD_ID, v)} /></td>
              <td><VarPicker source={card.CARD_SOURCE_SECTION} value={card.CARD_IMPACT_VAR} label={`Headline of ${card.CARD_ID}`} onChange={(v) => bindCardVariable(id, card.CARD_ID, 'CARD_IMPACT_VAR', v)} /></td>
              <td><KeySlot id={id} card={card} slot="CARD_KEY1_VAR" title="Key figure 1" /></td>
              <td><KeySlot id={id} card={card} slot="CARD_KEY2_VAR" title="Key figure 2" /></td>
              <td><OverlayPicker value={card.CARD_OVERLAY_CTRL} label={`Overlay of ${card.CARD_ID}`} onChange={(v) => setCardField(id, card.CARD_ID, 'CARD_OVERLAY_CTRL', v ?? '')} /></td>
              <td><SectionPicker value={card.CARD_TARGET_SECTION} label={`Target of ${card.CARD_ID}`} onChange={(v) => setCardField(id, card.CARD_ID, 'CARD_TARGET_SECTION', v)} /></td>
              <td><button type="button" className="ac-btn" aria-label={`Remove ${card.CARD_ID}`} onClick={() => removeCard(id, card.CARD_ID, card.CARD_NAME_VALUE)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <button type="button" className="ac-btn" onClick={() => addCard(id)}>➕ Add card</button>
    </>
  );
}
