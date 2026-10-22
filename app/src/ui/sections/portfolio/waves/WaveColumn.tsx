import type { DragEvent } from 'react';
import { removeWave, renameWave, reorderWave, setWaveNote, setWaveStart } from '@/controllers/wave';
import type { BoardColumn } from '@/domain/portfolio';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { toast } from '@/ui/uiState';
import { NumCell } from '@/ui/widgets/CommitField';
import { DraftText } from '@/ui/widgets/DraftText';
import { ProductCard } from './ProductCard';

interface Props { col: BoardColumn; cols: BoardColumn[]; index: number; waves: number; dragging: string | null; onDrag: (id: string | null) => void; onDrop: (col: BoardColumn) => void }

/** The wave's own controls: name, start month (with the calendar month it falls in), order, note, removal. */
function Controls({ col, index, waves }: Pick<Props, 'col' | 'index' | 'waves'>) {
  const id = col.id as string, n = col.name;
  return (
    <div className="ac-wave-ctrl">
      <DraftText label={`Nom de la vague ${n}`} value={n} onCommit={(v) => toast(renameWave(id, v) ? `Vague renommée : ${v.trim()}` : 'Nom invalide')} />
      <label>Démarrage (mois){' '}
        <NumCell ariaLabel={`Démarrage de ${n} (mois)`} value={col.startMonth} min={0} step={1} width={64} onCommit={(v) => { setWaveStart(id, parseInt(v, 10) || 0); }} />
      </label>
      <span className="ac-muted" title="Mois calendaire du démarrage (date de début du portefeuille + mois)">→ {col.startLabel}</span>
      <div className="ac-pf-actions" role="group" aria-label={`Actions de la vague ${n}`}>
        <button type="button" disabled={index === 0} aria-label={`Avancer la vague ${n}`} onClick={() => { reorderWave(id, index - 1); toast(`${n} : position ${index}`); }}>◀</button>
        <button type="button" disabled={index === waves - 1} aria-label={`Reculer la vague ${n}`} onClick={() => { reorderWave(id, index + 1); toast(`${n} : position ${index + 2}`); }}>▶</button>
        <button type="button" aria-label={`Supprimer la vague ${n}`} onClick={() => { removeWave(id); toast(`${n} supprimée, ses produits ne sont plus planifiés — Ctrl+Z pour annuler`); }}>Supprimer</button>
      </div>
      <DraftText label={`Note de la vague ${n}`} value={col.note} placeholder="Note" onCommit={(v) => { setWaveNote(id, v); }} />
    </div>
  );
}

/** One column of the board: a labelled region for a wave (or the unplanned products), its totals from the consolidation, and its cards. */
export function WaveColumn({ col, cols, index, waves, dragging, onDrag, onDrop }: Props) {
  const t = col.totals, over = (e: DragEvent) => { if (dragging) e.preventDefault(); };
  return (
    <section className="ac-wave-col" role="region" aria-label={col.id === null ? col.name : `Vague : ${col.name}`} data-wave={col.id ?? ''} data-dragging={dragging ? '' : undefined}
      onDragOver={over} onDrop={(e) => { e.preventDefault(); onDrop(col); }}>
      <header>
        {col.id === null ? <strong className="ac-wave-title">{col.name}</strong> : <Controls col={col} index={index} waves={waves} />}
        {t ? (
          <p className="ac-wave-totals" title="Chiffres consolidés de la vague (calendaires : la VAN est actualisée depuis le mois 1 du portefeuille)">
            {t.products} produit{t.products > 1 ? 's' : ''} · Économies {fmtEurK(t.savings)} · Net {fmtEurK(t.net)} · VAN {fmtEurK(t.npv)} · Retour {fmtMonths(t.paybackMonth)}
          </p>
        ) : <p className="ac-wave-totals ac-muted">Exclus de la consolidation (un avertissement est affiché).</p>}
      </header>
      <ul className="ac-wave-cards" aria-label={`Produits : ${col.name}`}>
        {col.cards.map((c) => <ProductCard key={c.id} card={c} cols={cols} onDrag={onDrag} />)}
        {!col.cards.length && <li className="ac-muted ac-wave-empty">Aucun produit : glissez-en un ici.</li>}
      </ul>
    </section>
  );
}
