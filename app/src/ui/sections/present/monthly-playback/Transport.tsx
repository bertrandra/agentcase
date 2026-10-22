import type { Dispatch } from 'react';
import { MP_META, MP_ORDER, mpReadout } from '@/domain/pdc/playback';
import type { Act, PlayerState } from './usePlayer';

/** The VCR controls of the playback (transport, position, speed, loop and the metrics to play): view state only, shared by the product and the aggregate views. */
export function Transport({ p, months, dispatch, seek }: { p: PlayerState; months: number; dispatch: Dispatch<Act>; seek: (m: number) => void }) {
  return (
    <>
      <div className="ac-form-row" role="group" aria-label="Transport">
        <button type="button" className="ac-btn" onClick={() => dispatch({ t: p.playing ? 'pause' : 'play' })}>{p.playing ? '⏸ Pause' : '▶ Play'}</button>
        <input type="range" min={0} max={months} step={1} value={p.month} aria-label="Position in the trajectory (months)" onChange={(e) => seek(parseInt(e.target.value, 10) || 0)} />
        <strong aria-live="polite">{mpReadout(p.month)}</strong>
        <label>Speed <select value={p.speed} onChange={(e) => dispatch({ t: 'speed', speed: e.target.value })}>
          {['0.5', '1', '2', '4'].map((x) => <option key={x} value={x}>{x}x</option>)}</select></label>
        <label className="ac-check"><input type="checkbox" checked={p.loop} onChange={(e) => dispatch({ t: 'loop', loop: e.target.checked })} /> Loop</label>
      </div>
      <div className="ac-form-row" role="group" aria-label="Metrics">
        {MP_ORDER.map((k) => <label key={k} className="ac-check"><input type="checkbox" checked={p.metrics[k]} onChange={(e) => dispatch({ t: 'metric', key: k, on: e.target.checked })} /> {MP_META[k].checkbox}</label>)}
      </div>
    </>
  );
}
