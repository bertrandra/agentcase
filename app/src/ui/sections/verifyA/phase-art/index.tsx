import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { PHASES } from '@/domain';
import { phaseArtRows, supMatrix } from '@/domain/verifyA';
import { fmt1 } from '@/ui/economicsFormat';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Badge, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SimpleTable } from '../SimpleTable';
import { useLive } from '../useLive';
import { useTheme } from '@/ui/themeContext';

const help = (
  <>
    <p>Two read-only views of the in-scope artefacts by phase. The <b>supervision matrix</b> compares each phase's floor (the w-weighted irreducible human supervision) with the projected human share at the horizon end; a negative margin would violate the floor.</p>
    <p>The <b>phase table</b> gives, per phase, the artefact count, the average human supervision and automatable share, and the relative vFTE at the horizon end.</p>
  </>
);

/** Phase / artefact details — supervision floors and postures, and the per-phase supervision and automation averages. */
export default function PhaseArtSection() {
  const { tok } = useTheme(), live = useLive(), { rows, chart } = phaseArtRows(live), sup = supMatrix(live), h = live.m.horizon;
  const cfg = useMemo((): ChartConfiguration => ({ type: 'bar', data: { labels: chart.map((c) => [c.phase, PHASES.find((p) => p.id === c.phase)?.name ?? c.phase]), datasets: [
    { label: 'Human sup. %', data: chart.map((c) => c.human), backgroundColor: tok('warning-600') },
    { label: 'Automatable %', data: chart.map((c) => c.agent), backgroundColor: tok('teal-700') }] },
  options: { plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, max: 100, grid: { color: tok('chart-grid') } } } } }), [chart, tok]);
  return (
    <SectionFrame title="Phase / Artifact details" help={help}
      result={<>
        <Panel title="Supervision matrix — floors & postures" aside={<Badge tone="blue">EV-03 · v12.58</Badge>}>
          <p className="ac-muted">One view for the three control languages: the <b>floor</b> (w-weighted irreducible human supervision of in-scope artifacts), the projected <b>human share at Y{h}</b>,
            and the referential <b>posture</b> (floor ≥ 60% → Human-in-the-lead · 30–60% → on-the-loop · &lt; 30% → over-the-loop). A negative margin would violate the floor (CC-SUP-01).</p>
          <SimpleTable align={['left', 'center', 'center', 'center', 'center']} head={['Phase', 'Supervision floor', `Human share Y${h}`, 'Margin', 'Posture']}
            rows={sup.map((r) => ({ key: r.phase, cells: [<>{r.phase} <small>({r.n} art.)</small></>, `${Math.round(r.floor)}%`, `${Math.round(r.human)}%`,
              <b data-ink={r.gap >= 10 ? 'teal' : r.gap >= 0 ? 'amber' : 'brick'}>{`${r.gap >= 0 ? '+' : ''}${Math.round(r.gap)} pts`}</b>, r.posture] }))} />
        </Panel>
        <p className="ac-muted">Detail per V-cycle phase: number of SDLC &amp; regulatory artifacts, average human supervision, vFTE by ramp. Contextual to the loaded reference.</p>
        <ChartPanel config={cfg} label="Human supervision and automatable share by phase" height={260} />
        <SimpleTable align={['left', 'left', 'center', 'center', 'center', 'center']} head={['Phase', 'Name', 'SDLC artifacts', 'Avg human sup.', 'Avg automatable', `vFTE Y${live.eng.horizonYears} (relative)`]}
          rows={rows.map((r) => ({ key: r.id, cells: [<b>{r.id}</b>, r.name, r.sdlc, `${r.human}%`, `${r.agent}%`, fmt1(r.vfte)] }))} />
      </>} />
  );
}
