import { useMemo } from 'react';
import { MP_META, MP_ORDER, mpReadout, playbackSeries } from '@/domain/pdc/playback';
import { useCtx } from '@/store/hooks';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { legendOf, playbackChart } from './chart';
import { sequence, usePlayer } from './usePlayer';

const help = (
  <>
    <p>Pick one or more metrics: the player runs them one after the other, in order. Designed for a live conversation with the client rather than a table to read.</p>
    <p>Pure read layer over the Time Engine: human FTE, agent vFTE, monthly run cost and cumulative savings come from the same live engine; velocity and cost per point reuse the performance ramp at monthly resolution.</p>
  </>
);

/** Monthly Playback — animated month-by-month trajectory viewer (VCR controls over the Time Engine series). */
export default function MonthlyPlaybackSection() {
  const c = useCtx();
  const s = useMemo(() => playbackSeries(c), [c]), { s: p, dispatch, seek } = usePlayer(s.months);
  const seq = sequence(p.metrics), key = seq[Math.min(p.seq, seq.length - 1)], cfg = useMemo(() => (key ? playbackChart(s, key, p.month) : null), [s, key, p.month]);
  return (
    <SectionFrame title="Monthly Playback" help={help}
      input={<>
        <div className="ac-form-row" role="group" aria-label="Transport">
          <button type="button" className="ac-btn" onClick={() => dispatch({ t: p.playing ? 'pause' : 'play' })}>{p.playing ? '⏸ Pause' : '▶ Play'}</button>
          <input type="range" min={0} max={s.months} step={1} value={p.month} aria-label="Position in the trajectory (months)" onChange={(e) => seek(parseInt(e.target.value, 10) || 0)} />
          <strong aria-live="polite">{mpReadout(p.month)}</strong>
          <label>Speed <select value={p.speed} onChange={(e) => dispatch({ t: 'speed', speed: e.target.value })}>
            {['0.5', '1', '2', '4'].map((x) => <option key={x} value={x}>{x}x</option>)}</select></label>
          <label className="ac-check"><input type="checkbox" checked={p.loop} onChange={(e) => dispatch({ t: 'loop', loop: e.target.checked })} /> Loop</label>
        </div>
        <div className="ac-form-row" role="group" aria-label="Metrics">
          {MP_ORDER.map((k) => <label key={k} className="ac-check"><input type="checkbox" checked={p.metrics[k]} onChange={(e) => dispatch({ t: 'metric', key: k, on: e.target.checked })} /> {MP_META[k].checkbox}</label>)}
        </div>
      </>}
      result={key && cfg ? (
        <>
          <div className="ac-form-row"><h3 data-testid="mp-title">{MP_META[key].title}</h3><span className="ac-muted" data-testid="mp-pos">{Math.min(p.seq, seq.length - 1) + 1} / {seq.length}</span></div>
          <div className="ac-form-row">{legendOf(key).map((l) => <span key={l.label}><span style={{ display: 'inline-block', width: 10, height: 10, background: l.color, marginRight: 4 }} />{l.label}</span>)}</div>
          <ChartPanel config={cfg} label={`${MP_META[key].title} — monthly trajectory, ${s.months} months`} height={320} />
        </>
      ) : <p className="ac-muted">Select at least one metric</p>} />
  );
}
