import type { KeyboardEvent } from 'react';
import { setProductOffset } from '@/controllers/product';
import type { BoardCard, BoardColumn } from '@/domain/portfolio';
import { NumCell } from '@/ui/widgets/CommitField';
import { columnOf, keyOf, moveProduct } from './moves';

/**
 * A product card. Draggable; focusable group: ArrowLeft / ArrowRight move it to the previous / next column, and the "Move to wave…"
 * menu does the same without a pointer. Its offset is edited in the card (the Time Engine starts at wave start + offset).
 */
export function ProductCard({ card, cols, onDrag }: { card: BoardCard; cols: BoardColumn[]; onDrag: (id: string | null) => void }) {
  const here = columnOf(cols, card.id), at = here ? cols.indexOf(here) : -1;
  const go = (to: BoardColumn | undefined) => { if (to) moveProduct(card.id, card.name, here, to); };
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cols[at + 1]); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cols[at - 1]); }
  };
  const label = `${card.name}${card.archived ? ', archived' : ''}, ${here?.name ?? ''}${card.startLabel ? `, starts ${card.startLabel}` : ''}`;
  return (
    <li className={`ac-card ac-wave-card${card.archived ? ' is-archived' : ''}`} data-product={card.id} draggable tabIndex={0} aria-label={label}
      aria-description="Left and right arrows: change wave. Drag and drop also works."
      onKeyDown={onKey} onDragStart={(e) => { e.dataTransfer?.setData('text/plain', card.id); onDrag(card.id); }} onDragEnd={() => onDrag(null)}>
      <strong>{card.name}</strong>{card.archived && <em> (archived)</em>}
      <div className="ac-muted">{card.etp.toFixed(1)} FTE{card.startLabel ? ` · starts ${card.startLabel}` : ' · excluded from the consolidation'}</div>
      <label className="ac-wave-offset">Offset (months){' '}
        <NumCell ariaLabel={`Offset in months of ${card.name}`} value={card.offset} min={0} step={1} width={56} onCommit={(v) => { setProductOffset(card.id, parseInt(v, 10) || 0); }} />
      </label>
      <select aria-label={`Move ${card.name} to wave…`} value="" onChange={(e) => go(cols.find((c) => keyOf(c) === e.target.value))}>
        <option value="">Move to wave…</option>
        {cols.filter((c) => c !== here).map((c) => <option key={keyOf(c)} value={keyOf(c)}>{c.name}</option>)}
      </select>
    </li>
  );
}
