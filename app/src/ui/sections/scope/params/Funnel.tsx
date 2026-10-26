import { useEffect, useMemo, useRef, useState } from 'react';
import { activeStages, funnelStage, FUNNEL_EPS, type AutoBase } from '@/domain/scope/automation';
import { FunnelSvg } from './FunnelSvg';
import { useTheme } from '@/ui/themeContext';

let autoplayed = false;   // the replay starts by itself once per session, like the legacy funnel

/** 🧱 Human & regulatory glass ceiling — the stage chain evaluated at one month, with play / scrub through the horizon (view state only). */
export function Funnel({ base }: { base: AutoBase }) {
  const motion = useRef(false);
  motion.current = useTheme().spec.reduceMotion;   // the system setting or the viewer's "Reduce motion" option (ui/display), read when the funnel mounts
  const N = base.N, [st, setSt] = useState<{ month: number | null; playing: boolean }>({ month: null, playing: false });
  useEffect(() => { if (!autoplayed && N > 1 && !motion.current) { autoplayed = true; setSt({ month: 1, playing: true }); } }, [N]);
  useEffect(() => {
    if (!st.playing) return;
    const step = () => setSt((s) => { const m = (s.month ?? 1) + 1; return m >= N ? { month: N, playing: false } : { month: m, playing: true }; });
    const id = setInterval(step, Math.max(70, Math.round(7000 / N)));
    return () => clearInterval(id);
  }, [st.playing, N]);
  const S = funnelStage(base, st.month), A = useMemo(() => activeStages(base), [base]), atEnd = S.t >= S.N, end = base.endLabel;
  const play = (fromStart: boolean) => setSt((s) => ({ month: fromStart || s.month === null || s.month >= N ? 1 : s.month, playing: true }));
  const toggle = () => (st.playing ? setSt({ ...st, playing: false }) : play(false));
  const scrub = (raw: string) => setSt({ month: Math.max(1, Math.min(N, parseInt(raw, 10) || 1)), playing: false });
  return (
    <details open className="ac-card" data-rail="brick">
      <summary><h2 className="ac-summary-title">🧱 Human &amp; regulatory glass ceiling — what can never be fully automated</h2></summary>
      <p className="ac-muted">The same story as the curve above, read <strong>down</strong> instead of across: where the automation potential actually goes,
        stage by stage. Band colours match the curve&apos;s, so this doubles as its legend.</p>
      <div className="ac-player">
        <button type="button" className="ac-funnel-play" onClick={toggle}>{st.playing ? '⏸ Pause' : atEnd ? '▶ Replay' : '▶ Play'}</button>
        <button type="button" title="Replay from month 1" onClick={() => play(true)}>↻</button>
        <input type="range" min={1} max={N} value={S.t} aria-label="Month within the horizon" onChange={(e) => scrub(e.target.value)} />
        <output>Month <strong>{S.t}</strong> of {S.N} · Y{S.yearIdx} · adoption <strong>{S.ramp.toFixed(1)}%</strong></output>
      </div>
      <FunnelSvg S={S} A={A} />
      <div className="ac-callout">
        {atEnd
          ? <>At {end} the case is built on <strong className="ac-tone" data-tone="teal">{S.v5.toFixed(1)}%</strong>, not the {S.v1.toFixed(1)}%
            potential{S.lost > FUNNEL_EPS ? <> — <strong>{S.lost.toFixed(1)} points</strong> of theoretical automation are given back to
            the constraints above before a single euro is claimed.</> : '.'}</>
          : <>At month {S.t} the case is running at <strong className="ac-tone" data-tone="teal">{S.v5.toFixed(1)}%</strong> of the delivery work, against a
            permitted depth of {S.v3.toFixed(1)}% — the gap is the ramp, and it closes on its own; the gap above it does not.</>}
        {' '}Realistic automation is what survives compliance, work mix, ramp and supervision; theoretical automation is what survives none of them.
      </div>
    </details>
  );
}
