import { textColor } from '@/ui/colorText';
import { useState, type ReactNode } from 'react';
import type { NavSection } from '@/domain/nav/layout';
import type { MenuGroup } from '@/domain/pdc/personas';
import { cssVars } from '@/ui/cssVars';
import { groupColor } from '@/ui/zones/navModel';
import { useTheme } from '@/ui/themeContext';

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

/** The drag handlers a column and its cards share: hovering a place, dropping on it (before a card, or at the end with `null`). */
interface DragOps { hover: (before: string | null) => void; drop: (before: string | null) => void; start: (id: string) => void; end: () => void }

/** The arrow buttons of a card: ↑ ↓ inside the group, ← → to the previous / next group (global board only). */
function CardOps({ s, onShift, onShiftGroup }: { s: NavSection } & Pick<Props, 'onShift' | 'onShiftGroup'>) {
  return (
    <div className="ac-ncard-ops">
      <button type="button" className="ac-btn" aria-label={`Move ${s.label} up`} onClick={() => onShift(s.id, -1)}>↑</button>
      <button type="button" className="ac-btn" aria-label={`Move ${s.label} down`} onClick={() => onShift(s.id, 1)}>↓</button>
      {onShiftGroup && <button type="button" className="ac-btn" aria-label={`Move ${s.label} to the previous group`} onClick={() => onShiftGroup(s.id, -1)}>←</button>}
      {onShiftGroup && <button type="button" className="ac-btn" aria-label={`Move ${s.label} to the next group`} onClick={() => onShiftGroup(s.id, 1)}>→</button>}
    </div>
  );
}

/** One section card of a column. */
function Card({ s, color, ops, props }: { s: NavSection; color: string; ops: DragOps; props: Props }) {
  const { cardClass, cardExtra, canDrag, onDouble } = props;
  return (
    <div
      data-section={s.id}
      className={`ac-ncard ${cardClass?.(s) ?? ''}`}
      draggable={canDrag ? canDrag(s) : true}
      style={cssVars({ '--ac-group-color': color })}   // dynamic: the group colour is case data
      onDragStart={(e) => { ops.start(s.id); e.dataTransfer?.setData('text/plain', s.id); }}
      onDragEnd={ops.end}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); ops.hover(s.id); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); ops.drop(s.id); }}
      onDoubleClick={() => onDouble?.(s.id)}
    >
      <strong>{s.label}</strong>
      <div className="ac-muted ac-ncard-id"><code>{s.id}</code> · seq {s.groupSeq || 0}</div>
      {cardExtra?.(s)}
      <CardOps s={s} onShift={props.onShift} onShiftGroup={props.onShiftGroup} />
    </div>
  );
}

/** One group column: its head (with the ◀ ▶ column moves of the global board), then its cards, or "drop here" when empty. */
function Column({ col, over, ops, leave, props }: { col: Col; over: boolean; ops: DragOps; leave: () => void; props: Props }) {
  const { tok } = useTheme(), { group, cards } = col, { onShiftColumn } = props;
  const color = groupColor(props.colors, group.id, 'var(--ac-slate-600)');
  const ink = textColor(groupColor(props.colors, group.id, tok('slate-600')), tok, tok('slate-45'));
  return (
    <div
      role="listitem"
      aria-label={group.label}
      data-group={group.id}
      className={`ac-ncol${over ? ' is-over' : ''}`}
      style={cssVars({ '--ac-group-color': color, '--ac-group-ink': ink })}   // dynamic: the group colour is case data
      onDragOver={(e) => { e.preventDefault(); ops.hover(null); }}
      onDragLeave={leave}
      onDrop={(e) => { e.preventDefault(); ops.drop(null); }}
    >
      <div className="ac-ncol-head">
        {onShiftColumn && <button type="button" className="ac-btn" aria-label={`Move the group ${group.label} left`} onClick={() => onShiftColumn(group.id, -1)}>◀</button>}
        <span className="ac-grow">{group.label} <small className="ac-muted">({cards.length})</small></span>
        {onShiftColumn && <button type="button" className="ac-btn" aria-label={`Move the group ${group.label} right`} onClick={() => onShiftColumn(group.id, 1)}>▶</button>}
      </div>
      {cards.length === 0 && <p className="ac-muted ac-ncol-empty">drop here</p>}
      {cards.map((s) => <Card key={s.id} s={s} color={color} ops={ops} props={props} />)}
    </div>
  );
}

/** Group columns of section cards. Cards move by drag and drop or with the arrow buttons; the caller turns a move into a command. */
export function Board(props: Props) {
  const { label, cols, onDrop, onPending } = props;
  const [drag, setDrag] = useState<string | null>(null), [over, setOver] = useState<string | null>(null);
  const at = (cards: NavSection[], before: string | null) => {
    const rest = cards.filter((c) => c.id !== drag), i = before ? rest.findIndex((c) => c.id === before) : -1;
    return i < 0 ? rest.length : i;
  };
  const hover = (group: string, cards: NavSection[], before: string | null) => { setOver(group); if (drag) onPending?.({ id: drag, group, index: at(cards, before) }); };
  const clear = () => { setDrag(null); setOver(null); onPending?.(null); };
  const drop = (group: string, cards: NavSection[], before: string | null) => {
    const id = drag; clear();
    if (!id) return;
    const rest = cards.filter((c) => c.id !== id), i = before ? rest.findIndex((c) => c.id === before) : -1;
    onDrop(id, group, i < 0 ? rest.length : i);
  };
  const opsOf = ({ group, cards }: Col): DragOps => ({
    hover: (before) => hover(group.id, cards, before), drop: (before) => drop(group.id, cards, before), start: setDrag, end: clear,
  });
  const leave = () => { setOver(null); onPending?.(null); };
  return (
    <div className="ac-nboard" role="list" aria-label={label}>
      {cols.map((col) => <Column key={col.group.id} col={col} over={over === col.group.id} ops={opsOf(col)} leave={leave} props={props} />)}
    </div>
  );
}
