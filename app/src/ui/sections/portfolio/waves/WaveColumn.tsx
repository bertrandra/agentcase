import type { DragEvent } from 'react';
import { removeWave, renameWave, reorderWave, setWaveNote } from '@/controllers/wave';
import type { BoardColumn } from '@/domain/portfolio';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';
import { ProductCard } from './ProductCard';
import { WaveTiming } from './WaveRef';

interface Props { col: BoardColumn; cols: BoardColumn[]; index: number; waves: number; dragging: string | null; onDrag: (id: string | null) => void;
  onDrop: (col: BoardColumn) => void }

/** The wave's own controls: name, order, note, removal; its start and dependency as context (edited in the Process section, phase B9b). */
function Controls({ col, index, waves }: Pick<Props, 'col' | 'index' | 'waves'>) {
  const id = col.id as string, n = col.name;
  return (
    <div className="ac-wave-ctrl">
      <DraftText label={`Name of wave ${n}`} value={n} onCommit={(v) => toast(renameWave(id, v) ? `Wave renamed: ${v.trim()}` : 'Invalid name')} />
      <WaveTiming col={col} />
      <div className="ac-pf-actions" role="group" aria-label={`Actions of wave ${n}`}>
        <button
          type="button"
          disabled={index === 0}
          aria-label={`Move wave ${n} earlier`}
          onClick={() => { reorderWave(id, index - 1); toast(`${n}: position ${index}`); }}
        >◀</button>
        <button
          type="button"
          disabled={index === waves - 1}
          aria-label={`Move wave ${n} later`}
          onClick={() => { reorderWave(id, index + 1); toast(`${n}: position ${index + 2}`); }}
        >▶</button>
        <button
          type="button"
          aria-label={`Delete wave ${n}`}
          onClick={() => { removeWave(id); toast(`${n} deleted, its products are no longer scheduled — Ctrl+Z to undo`); }}
        >Delete</button>
      </div>
      <DraftText label={`Note of wave ${n}`} value={col.note} placeholder="Note" onCommit={(v) => { setWaveNote(id, v); }} />
    </div>
  );
}

/** One column of the board: a labelled region for a wave (or the unplanned products), its totals from the consolidation, and its cards. */
export function WaveColumn({ col, cols, index, waves, dragging, onDrag, onDrop }: Props) {
  const t = col.totals, over = (e: DragEvent) => { if (dragging) e.preventDefault(); };
  return (
    <section className="ac-wave-col" role="region" aria-label={col.id === null ? col.name : `Wave: ${col.name}`} data-wave={col.id
      ?? ''} data-dragging={dragging ? '' : undefined}
      onDragOver={over} onDrop={(e) => { e.preventDefault(); onDrop(col); }}>
      <header>
        {col.id === null ? <strong className="ac-wave-title">{col.name}</strong> : <Controls col={col} index={index} waves={waves} />}
        {t ? (
          <p className="ac-wave-totals" title="Consolidated figures of the wave (calendar: the NPV is discounted from month 1 of the portfolio)">
            {t.products} product{t.products > 1 ? 's'
              : ''} · Savings {fmtEurK(t.savings)} · Net {fmtEurK(t.net)} · NPV {fmtEurK(t.npv)} · Payback {fmtMonths(t.paybackMonth)}
          </p>
        ) : <p className="ac-wave-totals ac-muted">Excluded from the consolidation (a warning is shown).</p>}
      </header>
      <ul className="ac-wave-cards" aria-label={`Products: ${col.name}`}>
        {col.cards.map((c) => <ProductCard key={c.id} card={c} cols={cols} onDrag={onDrag} />)}
        {!col.cards.length && <li className="ac-muted ac-wave-empty">No product: drag one here.</li>}
      </ul>
    </section>
  );
}
