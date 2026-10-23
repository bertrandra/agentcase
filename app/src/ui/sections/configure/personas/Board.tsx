import { textColor } from '@/ui/colorText';
import { useState, type ReactNode } from 'react';
import type { NavSection } from '@/domain/nav/layout';
import type { MenuGroup } from '@/domain/pdc/personas';
import { groupColor } from '@/ui/zones/navModel';
import { tok } from '@/domain/theme';

export interface Col { group: MenuGroup; cards: NavSection[] }
interface Props {
  label: string; cols: Col[]; colors: Record<string, string>;
  /** extra class of a card (assigned / MVP …) and extra content under its title */
  cardClass?: (s: NavSection) => string; cardExtra?: (s: NavSection) => ReactNode;
  onDrop: (id: string, group: string, index: number) => void;
  onShift: (id: string, dir: -1 | 1) => void;
  /** move a card to the previous / next group (global board only) */
  onShiftGroup?: (id: string, dir: -1 | 1) => void;
  /** move a whole column (global board only) */
  onShiftColumn?: (group: string, dir: -1 | 1) => void;
  onDouble?: (id: string) => void;
  canDrag?: (s: NavSection) => boolean;
  /** where the dragged card would land if dropped now (null when nothing is hovered): lets a caller preview the move without committing it */
  onPending?: (p: { id: string; group: string; index: number } | null) => void;
}

/** Group columns of section cards. Cards move by drag and drop or with the arrow buttons; the caller turns a move into a command. */
export function Board({ label, cols, colors, cardClass, cardExtra, onDrop, onShift, onShiftGroup, onShiftColumn, onDouble, canDrag, onPending }: Props) {
  const [drag, setDrag] = useState<string | null>(null), [over, setOver] = useState<string | null>(null);
  const at = (cards: NavSection[], before: string | null) => { const rest = cards.filter((c) => c.id !== drag), i = before ? rest.findIndex((c) => c.id === before) : -1; return i < 0 ? rest.length : i; };
  const hover = (group: string, cards: NavSection[], before: string | null) => { setOver(group); if (drag) onPending?.({ id: drag, group, index: at(cards, before) }); };
  const clear = () => { setDrag(null); setOver(null); onPending?.(null); };
  const drop = (group: string, cards: NavSection[], before: string | null) => {
    const id = drag; clear();
    if (!id) return;
    const rest = cards.filter((c) => c.id !== id), at = before ? rest.findIndex((c) => c.id === before) : -1;
    onDrop(id, group, at < 0 ? rest.length : at);
  };
  return (
    <div className="ac-nboard" role="list" aria-label={label}>
      {cols.map(({ group, cards }) => (
        <div key={group.id} role="listitem" aria-label={group.label} data-group={group.id} className={`ac-ncol${over === group.id ? ' is-over' : ''}`} style={{ borderTopColor: groupColor(colors, group.id) }}
          onDragOver={(e) => { e.preventDefault(); hover(group.id, cards, null); }} onDragLeave={() => { setOver(null); onPending?.(null); }} onDrop={(e) => { e.preventDefault(); drop(group.id, cards, null); }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontWeight: 'var(--ac-font-weight-bold)', color: textColor(groupColor(colors, group.id), tok('slate-45')) }}>
            {onShiftColumn && <button type="button" className="ac-btn" aria-label={`Move the group ${group.label} left`} onClick={() => onShiftColumn(group.id, -1)}>◀</button>}
            <span style={{ flex: 1 }}>{group.label} <small className="ac-muted">({cards.length})</small></span>
            {onShiftColumn && <button type="button" className="ac-btn" aria-label={`Move the group ${group.label} right`} onClick={() => onShiftColumn(group.id, 1)}>▶</button>}
          </div>
          {cards.length === 0 && <p className="ac-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>drop here</p>}
          {cards.map((s) => (
            <div key={s.id} data-section={s.id} className={`ac-ncard ${cardClass?.(s) ?? ''}`} draggable={canDrag ? canDrag(s) : true} style={{ borderLeftColor: groupColor(colors, group.id) }}
              onDragStart={(e) => { setDrag(s.id); e.dataTransfer?.setData('text/plain', s.id); }} onDragEnd={clear} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); hover(group.id, cards, s.id); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(group.id, cards, s.id); }} onDoubleClick={() => onDouble?.(s.id)}>
              <strong>{s.label}</strong>
              <div className="ac-muted" style={{ fontSize: 'var(--ac-font-size-xs)' }}><code>{s.id}</code> · seq {s.groupSeq || 0}</div>
              {cardExtra?.(s)}
              <div className="ac-ncard-ops">
                <button type="button" className="ac-btn" aria-label={`Move ${s.label} up`} onClick={() => onShift(s.id, -1)}>↑</button>
                <button type="button" className="ac-btn" aria-label={`Move ${s.label} down`} onClick={() => onShift(s.id, 1)}>↓</button>
                {onShiftGroup && <button type="button" className="ac-btn" aria-label={`Move ${s.label} to the previous group`} onClick={() => onShiftGroup(s.id, -1)}>←</button>}
                {onShiftGroup && <button type="button" className="ac-btn" aria-label={`Move ${s.label} to the next group`} onClick={() => onShiftGroup(s.id, 1)}>→</button>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
