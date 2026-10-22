import { useCallback, useEffect, useReducer, useRef } from 'react';
import { MP_ORDER, mpAdvance, type MetricKey } from '@/domain/pdc/playback';

const TICK_MS: Record<string, number> = { '0.5': 400, '1': 200, '2': 100, '4': 50 };

export interface PlayerState { playing: boolean; month: number; seq: number; speed: string; loop: boolean; metrics: Record<MetricKey, boolean> }
export type Act =
  | { t: 'play' } | { t: 'pause' } | { t: 'seek'; month: number } | { t: 'speed'; speed: string } | { t: 'loop'; loop: boolean }
  | { t: 'metric'; key: MetricKey; on: boolean } | { t: 'tick'; months: number } | { t: 'reset' };

const INIT: PlayerState = { playing: false, month: 0, seq: 0, speed: '1', loop: true, metrics: { fte: true, cost: true, savings: true, velocity: false, costsp: false } };
export const sequence = (m: PlayerState['metrics']): MetricKey[] => MP_ORDER.filter((k) => m[k]);

function reduce(s: PlayerState, a: Act): PlayerState {
  switch (a.t) {
    case 'play': return sequence(s.metrics).length ? { ...s, playing: true } : s;
    case 'pause': return { ...s, playing: false };
    case 'seek': return { ...s, playing: false, month: Math.max(0, a.month) };
    case 'speed': return { ...s, speed: a.speed };
    case 'loop': return { ...s, loop: a.loop };
    case 'reset': return { ...s, playing: false, month: 0, seq: 0 };
    case 'metric': {
      const metrics = { ...s.metrics, [a.key]: a.on };
      return { ...s, metrics, seq: 0, month: 0, playing: s.playing && sequence(metrics).length > 0 };
    }
    case 'tick': {
      const n = sequence(s.metrics).length;
      if (!n) return { ...s, playing: false };
      const next = mpAdvance(s, a.months, n, s.loop);
      return { ...s, month: next.month, seq: next.seq, playing: !next.stop };
    }
  }
}

/** Transient VCR state of the playback (UI only: nothing here is part of the case). `months` follows the horizon: a change resets to month 0. */
export function usePlayer(months: number) {
  const [s, dispatch] = useReducer(reduce, INIT), prev = useRef(months);
  useEffect(() => { if (prev.current !== months) { prev.current = months; dispatch({ t: 'reset' }); } }, [months]);
  useEffect(() => {
    if (!s.playing) return;
    const id = setInterval(() => dispatch({ t: 'tick', months }), TICK_MS[s.speed] ?? 200);
    return () => clearInterval(id);
  }, [s.playing, s.speed, months]);
  const seek = useCallback((m: number) => dispatch({ t: 'seek', month: Math.min(months, m) }), [months]);
  return { s, dispatch, seek };
}
