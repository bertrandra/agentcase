import { SCHEDULE_LABELS } from '@/domain/portfolio';
import { useScheduleNotes } from '@/store/waveScheduleHooks';
import { Panel } from '@/ui/widgets/cards';

/** The schedule diagnostics: waves moved by their dependency, setups pushed back by the capacity, dependencies ignored (cycle, unknown wave). */
export function ScheduleNotes() {
  const notes = useScheduleNotes();
  return (
    <Panel title="Schedule">
      <div aria-live="polite">
        {notes.length === 0 ? <p className="ac-muted">No diagnostic: every wave starts at its own start and no setup is pushed back.</p> : (
          <ul aria-label="Schedule diagnostics">
            {notes.map((d, i) => <li key={`${d.code}-${d.waveId ?? ''}-${d.productId ?? ''}-${i}`} data-code={d.code}>
              <strong>{SCHEDULE_LABELS[d.code] ?? d.code}</strong> — {d.message}</li>)}
          </ul>
        )}
      </div>
    </Panel>
  );
}
