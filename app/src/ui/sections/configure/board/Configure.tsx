import { bindCardVariable, renameCard } from '@/controllers/pdcBoard';
import type { CardSlot, DynSection } from '@/domain/pdc/board';
import { variablesForSection } from '@/domain/pdc/variables';
import { sectionById } from '@/ui/zones/registry';

const SLOTS: [CardSlot, string][] = [['CARD_IMPACT_VAR', 'Headline'], ['CARD_KEY1_VAR', 'Key figure 1'], ['CARD_KEY2_VAR', 'Key figure 2']];
const scopeLabel = (s: string) => (s === 'GLOBAL' ? 'GLOBAL' : (sectionById(s)?.label.replace(/^\S+\s/, '') ?? s));

/** Binds each card’s name and three slots to variables of its source section (or any GLOBAL variable). */
export function Configure({ section }: { section: DynSection }) {
  return (
    <div className="ac-table-wrap"><table className="ac-table">
      <caption>Configure — {section.title}</caption>
      <thead><tr><th>Card</th>{SLOTS.map(([, l]) => <th key={l}>{l}</th>)}</tr></thead>
      <tbody>
        {section.cards.map((card) => (
          <tr key={card.CARD_ID}>
            <td><input type="text" aria-label={`Name of ${card.CARD_ID}`} value={card.CARD_NAME_VALUE} onChange={(e) => renameCard(section.id, card.CARD_ID, e.target.value)} /></td>
            {SLOTS.map(([slot, l]) => (
              <td key={slot}>
                <select aria-label={`${l} of ${card.CARD_ID}`} value={card[slot] ?? ''} onChange={(e) => bindCardVariable(section.id, card.CARD_ID, slot, e.target.value || null)}>
                  <option value="">—</option>
                  {variablesForSection(card.CARD_SOURCE_SECTION ?? '').map((v) => <option key={v.id} value={v.id}>[{scopeLabel(v.scope)}] {v.label}</option>)}
                </select>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
