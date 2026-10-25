import { useMemo } from 'react';
import { usePlaybackAggregate } from '@/store/selectionHooksPresent';
import { fmt1, fmtK } from '@/ui/economicsFormat';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ExcludedNote } from '../../economics/AggParts';
import { playbackChart } from './chart';
import { useTheme } from '@/ui/themeContext';
import { PlaybackStage } from './Stage';
import { Transport } from './Transport';
import { sequence, usePlayer } from './usePlayer';

const help = (
  <>
    <p>The playback of the <strong>selection</strong> (Portfolio or one Wave) on the calendar axis. FTE, monthly cost and cumulative cash are the consolidated
      series: each planned product&apos;s own Time Engine months, shifted to its start and added up. Velocity and cost per point are the products&apos; own
      ramps weighted by entry headcount (a product that has not started yet is still AS-IS).</p>
    <p>Products without a wave, or archived, are left out (the banner above says how many). Choose a product in “Show” for the single-product playback.</p>
  </>
);
const R = 'right' as const;
const pct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x)}%`;

/** Monthly Playback — aggregate view (R-conso): the VCR over the consolidated trajectory of the Portfolio / Wave, and the end state of each product. */
export default function MonthlyPlaybackAggregate() {
  const a = usePlaybackAggregate(), months = a?.series.months ?? 0, { s: p, dispatch, seek } = usePlayer(months);
  const seq = sequence(p.metrics), key = seq[Math.min(p.seq, seq.length - 1)], { tok } = useTheme(),
    cfg = useMemo(() => (a && key ? playbackChart(a.series, key, p.month, tok) : null), [a, key, p.month, tok]);
  if (!a) return null;
  const cols: AggColumn<(typeof a.rows)[number]>[] = [
    { key: 'base', header: 'AS-IS FTE', align: R, render: (r) => fmt1(r.baseEtp) },
    { key: 'etp', header: 'Human FTE (end)', align: R, render: (r) => fmt1(r.etp) },
    { key: 'vfte', header: 'Agent vFTE (end)', align: R, render: (r) => fmt1(r.vfte) },
    { key: 'vel', header: 'Velocity', align: R, title: 'Velocity uplift at the end of the product horizon', render: (r) => pct(r.velocityPct) },
    { key: 'net', header: 'Net', align: R, render: (r) => fmtK(r.net) },
  ];
  const t = a.totals;
  return (
    <SectionFrame title={`Monthly Playback — ${a.label}`} help={help} input={<Transport p={p} months={months} dispatch={dispatch} seek={seek} />}
      result={<>
        <p className="ac-muted">Consolidated view of the
          selection: {a.label} ({a.rows.length} planned product{a.rows.length > 1 ? 's' : ''}), {months} calendar months. Every figure is read from the domain
          consolidation.</p>
        <PlaybackStage metric={key} cfg={cfg} pos={Math.min(p.seq, seq.length - 1)} count={seq.length} months={months} scope={a.label} />
        <AggregateTable caption={`End state by product — ${a.label}`} rows={a.rows} columns={cols} edit={false}
          totals={{ label: `Total — ${a.label}`, cells: { base: fmt1(t.baseEtp), etp: fmt1(t.etp), vfte: fmt1(t.vfte), vel: pct(t.velocityPct),
            net: fmtK(t.net) } }} />
        <ExcludedNote excluded={a.excluded} />
      </>} />
  );
}
