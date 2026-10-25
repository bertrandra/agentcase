import { setMaxConcurrentSetups } from '@/controllers/waveDeps';
import { SCHEDULE_LABELS } from '@/domain/portfolio';
import { useScheduleNotes, useSetupCapacity } from '@/store/waveScheduleHooks';
import { Panel } from '@/ui/widgets/cards';
import { NumCell } from '@/ui/widgets/CommitField';

/** Transformation-team capacity (portfolio parameter): at most N products in setup at the same time; 0 = no limit. One undoable step. */
export function SetupCapacity() {
  const cap = useSetupCapacity();
  return (
    <div className="ac-form-row">
      <label className="ac-field"><span className="ac-field-l">Max products in setup at the same time (0 = no limit)</span>
        <NumCell ariaLabel="Max products in setup at the same time (0 = no limit)" value={cap} min={0} step={1} width={64}
          onCommit={(v) => { setMaxConcurrentSetups(parseInt(v, 10) || 0); }} />
      </label>
    </div>
  );
}

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
