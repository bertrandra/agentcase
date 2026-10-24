import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { dimRows, readinessBand, readinessIndex, weakestDims } from '@/domain/tune';
import { Callout, Panel } from '@/ui/widgets/cards';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { useAnswers } from './Assessment';
import { useTheme } from '@/ui/themeContext';

/** Index (0–100) with its band and gauge, the radar chart, and the dimension bars with the weakest areas. */
export function ScoreCard() {
  const ans = useAnswers(), idx = readinessIndex(ans), band = readinessBand(idx), weak = weakestDims(ans);
  const rows = useMemo(() => dimRows(ans), [ans]);
  const { tok } = useTheme();
  const config = useMemo<ChartConfiguration>(() => ({
    type: 'radar',
    data: { labels: rows.map((r) => r.label), datasets: [{ label: 'Readiness', data: rows.map((r) => Math.round(r.score ?? 0)), fill: true,
      backgroundColor: tok('primary-500-a18'), borderColor: tok('primary-700'), pointBackgroundColor: tok('warning-600'), borderWidth: 2, pointRadius: 3 }] },
    options: { plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } } },
  }), [rows, tok]);
  return (
    <>
      <Panel title="AI Readiness Index">
        <div className="ac-readiness-score" aria-live="polite">
          <div className="ac-tone ac-readiness-index" data-tone={band.tone}>{idx == null ? '—' : Math.round(idx)}</div>
          <div className="ac-tone ac-readiness-band" data-tone={band.tone}>{band.label}</div>
        </div>
        <div role="meter" aria-label="AI readiness gauge" aria-valuenow={idx ?? 0} aria-valuemin={0} aria-valuemax={100} className="ac-readiness-gauge">
          {/* dynamic: the needle sits at the index */}
          <div className="ac-readiness-needle" style={{ left: `${idx ?? 0}%` }} />
        </div>
        <p className="ac-muted"><span>0 Nascent</span> · <span>Leading 100</span></p>
      </Panel>
      <Panel title="Readiness radar"><ChartPanel config={config} label="Readiness radar by dimension" height={320} /></Panel>
      <Panel title="Dimension scores">
        {rows.map((r) => (
          <div key={r.key} className="ac-form-row">
            <span className="ac-readiness-dim">{r.label}</span>
            {/* dynamic: the bar width is the dimension score */}
            <span className="ac-grow ac-bar ac-readiness-bar"><span data-tone={r.band.tone} style={{ width: `${r.score ?? 0}%` }} /></span>
            <strong className="ac-tone ac-readiness-val" data-tone={r.band.tone}>{r.score == null ? '—' : Math.round(r.score)}</strong>
          </div>
        ))}
        {weak && <Callout><strong>Priority pre-requisites:</strong> {weak}</Callout>}
      </Panel>
    </>
  );
}
