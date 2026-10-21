import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { dimRows, readinessBand, readinessIndex, weakestDims } from '@/domain/tune';
import { Callout, Panel } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { useAnswers } from './Assessment';

/** Index (0–100) with its band and gauge, the radar chart, and the dimension bars with the weakest areas. */
export function ScoreCard() {
  const ans = useAnswers(), idx = readinessIndex(ans), band = readinessBand(idx), weak = weakestDims(ans), rows = useMemo(() => dimRows(ans), [ans]);
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'radar',
    data: { labels: rows.map((r) => r.label), datasets: [{ label: 'Readiness', data: rows.map((r) => Math.round(r.score ?? 0)), fill: true,
      backgroundColor: 'rgba(55,138,221,0.18)', borderColor: '#0058AB', pointBackgroundColor: '#BE4D00', borderWidth: 2, pointRadius: 3 }] },
    options: { plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } } },
  }), [rows]);
  return (
    <>
      <Panel title="AI Readiness Index">
        <div style={{ textAlign: 'center' }} aria-live="polite">
          <div style={{ fontSize: 60, fontWeight: 300, color: band.color }}>{idx == null ? '—' : Math.round(idx)}</div>
          <div style={{ fontWeight: 600, color: band.color }}>{band.label}</div>
        </div>
        <div role="meter" aria-label="AI readiness gauge" aria-valuenow={idx ?? 0} aria-valuemin={0} aria-valuemax={100}
          style={{ height: 14, borderRadius: 8, position: 'relative', background: 'linear-gradient(90deg,#8F3237,#BE4D00,#1DB8F2,#00828E)' }}>
          <div style={{ position: 'absolute', top: -4, width: 4, height: 22, background: '#0058AB', border: '1px solid #fff', borderRadius: 2, left: `${idx ?? 0}%` }} />
        </div>
        <p className="ac-muted"><span>0 Nascent</span> · <span>Leading 100</span></p>
      </Panel>
      <Panel title="Readiness radar"><ChartPanel config={config} label="Readiness radar by dimension" height={320} /></Panel>
      <Panel title="Dimension scores">
        {rows.map((r) => (
          <div key={r.key} className="ac-form-row">
            <span style={{ width: 140 }}>{r.label}</span>
            <span className="ac-grow ac-bar"><span style={{ display: 'block', width: `${r.score ?? 0}%`, height: 16, background: r.band.color }} /></span>
            <strong style={{ width: 52, textAlign: 'right', color: r.band.color }}>{r.score == null ? '—' : Math.round(r.score)}</strong>
          </div>
        ))}
        {weak && <Callout><strong>Priority pre-requisites:</strong> {weak}</Callout>}
      </Panel>
    </>
  );
}
