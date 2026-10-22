import { useState } from 'react';
import { useWaveBoard } from '@/store/consolidationHooks';
import { goSection } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AddWave } from './AddWave';
import { columnOf, moveProduct } from './moves';
import { WaveColumn } from './WaveColumn';

const help = (
  <>
    <p>One column per wave, in deployment order, then the <strong>Non planifié</strong> column. A product in a wave starts at <em>wave start + its own offset</em> and is consolidated;
      an unplanned product is left out of the consolidation (and flagged in its diagnostics).</p>
    <p>Move a card by <strong>drag and drop</strong>, with the <strong>ArrowLeft / ArrowRight</strong> keys when the card has focus, or with its <strong>Déplacer vers la vague…</strong> menu.
      Every action is one undoable step (Ctrl+Z); the live region announces it. The totals of a wave are the consolidated figures of its planned products.</p>
  </>
);

/** Vagues — the wave board (F10-F12): create / rename / reorder / delete waves, their start month, the products' offsets and their assignment. */
export default function WavesSection() {
  const cols = useWaveBoard(), [dragging, setDragging] = useState<string | null>(null), waves = cols.length - 1;
  const drop = (to: (typeof cols)[number]) => {
    const id = dragging;
    setDragging(null);
    const from = id ? columnOf(cols, id) : undefined, card = from?.cards.find((c) => c.id === id);
    if (id && card) moveProduct(id, card.name, from, to);
  };
  return (
    <SectionFrame title="🌊 Vagues" help={help} input={<AddWave />}
      result={
        <>
          <div className="ac-wave-board" role="group" aria-label="Planche des vagues">
            {cols.map((c, i) => <WaveColumn key={c.id ?? 'none'} col={c} cols={cols} index={i} waves={waves} dragging={dragging} onDrag={setDragging} onDrop={drop} />)}
          </div>
          <Callout kind="blue">
            L’effet du hub de connaissance par vague (écart avec et sans hub) est dans la section{' '}
            <button type="button" className="ac-link" onClick={() => goSection('knowledge-transfer')}>🔁 Knowledge transfer</button> ; la trajectoire consolidée dans{' '}
            <button type="button" className="ac-link" onClick={() => goSection('consolidation')}>📈 Consolidation</button>.
          </Callout>
        </>
      } />
  );
}
