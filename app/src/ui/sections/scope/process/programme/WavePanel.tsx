import { useId } from 'react';
import { setWaveStart } from '@/controllers/wave';
import { setMaxConcurrentSetups } from '@/controllers/waveDeps';
import { activityDetail, type ProgrammeView } from '@/domain/programme';
import { useWaveBoard } from '@/store/consolidationHooks';
import { useSetupCapacity } from '@/store/waveScheduleHooks';
import { NumCell } from '@/ui/widgets/CommitField';
import { DetailLinks } from '@/ui/widgets/DetailLinks';
import { selectActivity } from '../view';
import { WaveDependency } from './WaveDependency';

/** The id prefix of a wave sub-process of the programme (`prog-wave-<wave id>`). */
export const WAVE_PREFIX = 'prog-wave-';

/** Transformation-team capacity (a parameter of the programme's lanes): at most N products in setup at once; 0 = no limit. One undoable step. */
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

/**
 * The parameter panel of a wave (a sub-process of the transformation programme, docs/SPEC_BPMN.md § 19.4 F-B67, § 19.7; phase B9b): its own
 * start month, its dependency on another wave (milestone and lag) and the transformation-team capacity on the lanes. The 🌊 Waves screen shows
 * them as context and links here; this panel is the one place that edits them (each edit one undoable step).
 */
export function WavePanel({ v, id }: { v: ProgrammeView; id: string }) {
  const w = v.waves.find((x) => x.id === id), col = useWaveBoard().find((c) => c.id === id.slice(WAVE_PREFIX.length)), k = useId();
  if (!w || !col) return null;
  return (
    <section className="ac-proc-panel" aria-labelledby={`${k}-h`}>
      <h3 id={`${k}-h`} tabIndex={-1}>{`Wave: ${w.name}`}</h3>
      <p>{`A sub-process of the programme: the per-product activities of its ${w.products.length} product(s) (${w.products.join(', ') || 'none'}).`}</p>
      <dl className="ac-proc-facts">
        <dt>Effective start</dt><dd>{`Month ${w.start}${w.dependency ? ` — ${w.dependency}` : ''}`}</dd>
      </dl>
      <DetailLinks id={w.id} name={w.name} detail={activityDetail(w.id, [], v)} />
      <fieldset className="ac-proc-fields">
        <legend>Parameters</legend>
        <label>Start (month){' '}
          <NumCell ariaLabel={`Start of ${w.name} (month)`} value={col.startMonth} min={0} step={1} width={64}
            onCommit={(x) => { setWaveStart(col.id as string, parseInt(x, 10) || 0); }} />
        </label>
        <WaveDependency col={col} />
        <SetupCapacity />
      </fieldset>
      <div className="ac-form-row"><button type="button" onClick={() => selectActivity(null)}>Close</button></div>
    </section>
  );
}
