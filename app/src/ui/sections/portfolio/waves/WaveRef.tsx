import type { BoardColumn } from '@/domain/portfolio';
import { useSetupCapacity } from '@/store/waveScheduleHooks';
import { openActivity } from '@/ui/widgets/ActivityRefs';

/** The id of a wave's sub-process in the programme (its parameter panel in the 🧩 Process section). */
const waveActivity = (id: string): string => `prog-wave-${id}`;

/**
 * A wave's start and dependency as context (docs/SPEC_BPMN.md § 19.7 F-B71; phase B9b): the waves are sub-processes of the transformation
 * programme, so their start, dependency and the transformation-team capacity are edited in the wave's parameter panel of the Process section only.
 */
export function WaveTiming({ col }: { col: BoardColumn }) {
  const n = col.name, moved = col.effectiveStart !== col.startMonth;
  return (
    <p className="ac-wave-timing">
      <span>{`Start: month ${col.startMonth}`}</span>{' '}{col.startLabel && <span className="ac-muted">{`→ ${col.startLabel}`}</span>}
      {col.after && <span>{` · starts after ${col.after}`}</span>}
      {moved && <span className="ac-wave-eff" data-effective-start={col.effectiveStart}>{` · effective start: month ${col.effectiveStart}`
        + `${col.effectiveLabel ? ` → ${col.effectiveLabel}` : ''}`}</span>}{' '}
      <button type="button" className="ac-link" onClick={() => openActivity(waveActivity(col.id as string))}>{`Open ${n} in Process`}</button>
    </p>
  );
}

/** The transformation-team capacity as context, with the link to the waves' panel in the Process section (where it is edited). */
export function CapacityRef({ firstWave }: { firstWave: string | null }) {
  const cap = useSetupCapacity();
  return (
    <p className="ac-muted">
      {`Transformation-team capacity: ${cap > 0 ? `at most ${cap} product(s) in setup at the same time` : 'no limit'}`}
      {firstWave && <>{' '}<button type="button" className="ac-link" onClick={() => openActivity(waveActivity(firstWave))}>
        Open the waves in Process</button></>}
    </p>
  );
}
