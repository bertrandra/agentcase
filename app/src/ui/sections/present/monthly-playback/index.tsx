import { useMemo } from 'react';
import { playbackSeries } from '@/domain/pdc/playback';
import { useCtx } from '@/store/hooks';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { playbackChart } from './chart';
import { useTheme } from '@/ui/themeContext';
import { PlaybackStage } from './Stage';
import { Transport } from './Transport';
import { sequence, usePlayer } from './usePlayer';

const help = (
  <>
    <p>Pick one or more metrics: the player runs them one after the other, in order. Designed for a live conversation with the client rather than a table to
      read.</p>
    <p>Pure read layer over the Time Engine: human FTE, agent vFTE, monthly run cost and cumulative savings come from the same live engine; velocity and cost
      per point reuse the performance ramp at monthly resolution.</p>
  </>
);

/** Monthly Playback — animated month-by-month trajectory viewer (VCR controls over the Time Engine series). */
export default function MonthlyPlaybackSection() {
  const c = useCtx();
  const s = useMemo(() => playbackSeries(c), [c]), { s: p, dispatch, seek } = usePlayer(s.months);
  const seq = sequence(p.metrics), key = seq[Math.min(p.seq, seq.length - 1)], { tok } = useTheme(),
    cfg = useMemo(() => (key ? playbackChart(s, key, p.month, tok) : null), [s, key, p.month, tok]);
  return (
    <SectionFrame title="Monthly Playback" help={help}
      input={<Transport p={p} months={s.months} dispatch={dispatch} seek={seek} />}
      result={<PlaybackStage metric={key} cfg={cfg} pos={Math.min(p.seq, seq.length - 1)} count={seq.length} months={s.months} />} />
  );
}
