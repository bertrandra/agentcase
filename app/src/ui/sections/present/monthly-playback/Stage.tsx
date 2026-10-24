import type { ChartConfiguration } from 'chart.js';
import { MP_META, type MetricKey } from '@/domain/pdc/playback';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { legendOf } from './chart';

/** The stage of the player (single product and Portfolio / Wave): title and position in the sequence, legend, chart; or the hint when no metric is chosen. */
export function PlaybackStage({ metric, cfg, pos, count, months, scope }: {
  metric: MetricKey | undefined; cfg: ChartConfiguration | null; pos: number; count: number; months: number; scope?: string;
}) {
  if (!metric || !cfg) return <p className="ac-muted">Select at least one metric</p>;
  return (
    <>
      <div className="ac-form-row"><h2 data-testid="mp-title">{MP_META[metric].title}</h2><span className="ac-muted" data-testid="mp-pos">{pos + 1} / {count}</span></div>
      <div className="ac-form-row">{legendOf(metric).map((l) => <span key={l.label}><span style={{ display: 'inline-block', width: 10, height: 10, background: l.color, marginRight: 4 }} />{l.label}</span>)}</div>
      <ChartPanel config={cfg} label={`${MP_META[metric].title} — ${scope ? `${scope}, ` : ''}monthly trajectory, ${months} months`} height={320} />
    </>
  );
}
