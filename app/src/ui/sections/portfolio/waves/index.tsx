import { useState } from 'react';
import { useWaveBoard } from '@/store/consolidationHooks';
import { goSection } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AddWave } from './AddWave';
import { columnOf, moveProduct } from './moves';
import { ScheduleNotes, SetupCapacity } from './Schedule';
import { WaveColumn } from './WaveColumn';

const help = (
  <>
    <p>One column per wave, in deployment order, then the <strong>Unscheduled</strong> column. A product in a wave starts at <em>wave start + its own
      offset</em> and is consolidated;
      an unplanned product is left out of the consolidation (and flagged in its diagnostics).</p>
    <p>Move a card by <strong>drag and drop</strong>, with the <strong>ArrowLeft / ArrowRight</strong> keys when the card has focus, or with its <strong>Move
      to wave…</strong> menu. Every action is one undoable step (Ctrl+Z); the live region announces it. The totals of a wave are the consolidated figures of
      its planned products.</p>
    <p>A wave may <strong>start after</strong> another wave: after it starts, or after its last product finishes setup, plus a lag in months. Its
      effective start is the later of its own start and that date (a choice that would close a cycle is not offered). The <strong>transformation-team
      capacity</strong> caps how many products are in setup at the same time: later products (wave order, then board order) are pushed back, and the
      Schedule checks list every move.</p>
  </>
);

/** Waves — the wave board (F10-F12): create / rename / reorder / delete waves, their start month, the products' offsets and their assignment. */
export default function WavesSection() {
  const cols = useWaveBoard(), [dragging, setDragging] = useState<string | null>(null), waves = cols.length - 1;
  const drop = (to: (typeof cols)[number]) => {
    const id = dragging;
    setDragging(null);
    const from = id ? columnOf(cols, id) : undefined, card = from?.cards.find((c) => c.id === id);
    if (id && card) moveProduct(id, card.name, from, to);
  };
  return (
    <SectionFrame title="🌊 Waves" help={help} input={<><AddWave /><SetupCapacity /></>} diagnostic={<ScheduleNotes />}
      result={
        <>
          <div className="ac-wave-board" role="group" aria-label="Wave board">
            {cols.map((c, i) => <WaveColumn
              key={c.id ?? 'none'}
              col={c}
              cols={cols}
              index={i}
              waves={waves}
              dragging={dragging}
              onDrag={setDragging}
              onDrop={drop}
            />)}
          </div>
          <Callout kind="blue">
            The knowledge hub effect by wave (gap with and without the hub) is in the{' '}
            <button
              type="button"
              className="ac-link"
              onClick={() => goSection('knowledge-transfer')}
            >🔁 Knowledge transfer</button> section; the consolidated trajectory is in{' '}
            <button type="button" className="ac-link" onClick={() => goSection('consolidation')}>📈 Consolidation</button>.
          </Callout>
        </>
      } />
  );
}
