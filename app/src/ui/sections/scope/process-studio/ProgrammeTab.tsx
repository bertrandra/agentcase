import { memo, useCallback, useId } from 'react';
import type { Ctx } from '@/domain';
import { isProgrammeId, programmeProcess, type ProgrammeView } from '@/domain/programme';
import { useCtxSelector, usePortfolio } from '@/store/hooks';
import { useActiveProductId, useIsMulti } from '@/store/portfolioHooks';
import { fmtEurK } from '@/ui/format';
import { ParamPanel } from '../process/programme/ParamPanel';
import { ProgrammePart } from '../process/programme/ProgrammePart';
import { selectActivity, useProcessView } from '../process/view';
import { setStudio, useStudio } from './view';

const LANE_H = 44, LABEL_W = 170, W = 1000, RUN_CAP = 600;

/** The programme's activities on its calendar (months from the roadmap start), by lane; the run bars are cut at the axis end. */
function Timeline({ v, selected }: { v: ProgrammeView; selected: string | null }) {
  const placed = v.activities.filter((a) => a.placement.span && a.active);
  const ends = placed.map((a) => a.placement.span!).filter((s) => s.dur < RUN_CAP).map((s) => s.start + s.dur);
  const axis = Math.max(12, Math.ceil(Math.max(0, ...ends) / 6) * 6 + 6), x = (m: number) => LABEL_W + (Math.min(m, axis) / axis) * (W - LABEL_W);
  const lanes = v.lanes.filter((l) => placed.some((a) => a.lane === l.role)), h = lanes.length * LANE_H + 28;
  const ticks = Array.from({ length: Math.floor(axis / 6) + 1 }, (_, i) => i * 6);
  return (
    <svg className="ac-studio-timeline" viewBox={`0 0 ${W} ${h}`} role="img"
      aria-label={`Programme timeline: ${placed.length} activities in ${lanes.length} lanes over ${axis} months (the list below gives each one)`}>
      {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={20} y2={h} className="ac-studio-tick" /><text x={x(t)} y={12}
        className="ac-studio-tick-label">{`m${t}`}</text></g>)}
      {lanes.map((l, i) => (
        <g key={l.id} transform={`translate(0 ${24 + i * LANE_H})`}>
          <line x1={0} x2={W} y1={LANE_H} y2={LANE_H} className="ac-studio-lane-line" />
          <text x={4} y={LANE_H / 2 + 4} className="ac-studio-lane-label">{l.name}</text>
          {placed.filter((a) => a.lane === l.role).map((a, j, all) => {
            const s = a.placement.span!, x0 = x(s.start), x1 = Math.max(x0 + 4, x(s.start + s.dur)), rows = all.length > 1 ? 2 : 1;
            const y = rows === 2 ? (j % 2) * (LANE_H / 2) + 3 : 8, hh = rows === 2 ? LANE_H / 2 - 6 : LANE_H - 16;
            return (
              <g key={a.id} className="ac-studio-bar" data-level={a.level} data-selected={a.id === selected || undefined}>
                <rect x={x0} y={y} width={x1 - x0} height={hh} rx={4} />
                {x1 - x0 > 60 && <text x={x0 + 5} y={y + hh / 2 + 4}>{a.name}</text>}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

/**
 * 🗺️ Process studio › Programme: the transformation programme as a timeline by lane (its real calendar) with the list of its activities — select one
 * to
 * edit its parameters — or as its BPMN diagram (the 🧩 Process section's programme part, swim lanes and all).
 */
export const ProgrammeTab = memo(function ProgrammeTab() {
  const id = useId(), sub = useStudio((s) => s.progView), selected = useProcessView((s) => s.selected);
  const multi = useIsMulti(), pf = usePortfolio((p) => (multi ? p : undefined)), productId = useActiveProductId();
  const v = useCtxSelector(useCallback((c: Ctx) => programmeProcess(c, pf, productId), [pf, productId]));
  const lane = new Map(v.lanes.map((l) => [l.role, l.name]));
  return (
    <div className="ac-studio-stack">
      <div role="group" aria-label="Programme view" className="ac-studio-seg ac-studio-seg-start">
        <button type="button" aria-pressed={sub === 'timeline'} onClick={() => setStudio({ progView: 'timeline' })}>Timeline</button>
        <button type="button" aria-pressed={sub === 'bpmn'} onClick={() => setStudio({ progView: 'bpmn' })}>BPMN diagram</button>
      </div>
      {sub === 'bpmn' ? <ProgrammePart /> : (
        <div className="ac-studio-split">
          <section className="ac-studio-card ac-studio-main" aria-labelledby={`${id}-t`}>
            <h2 id={`${id}-t`}>Transformation programme on its calendar</h2>
            <p className="ac-muted">One row per role of the operating model; months from the roadmap start. Engagement stages and case-level work in blue,
              per-product
              work in teal.</p>
            <Timeline v={v} selected={isProgrammeId(selected) ? selected : null} />
            <div className="ac-table-wrap" tabIndex={0}>
              <table className="ac-studio-table">
                <caption className="ac-sr">Programme activities</caption>
                <thead><tr><th scope="col">Activity</th><th scope="col">Role (lane)</th><th scope="col">Instances</th><th
                  scope="col">Duration and placement</th>
                  <th scope="col">Cost</th></tr></thead>
                <tbody>{v.activities.map((a) => (
                  <tr key={a.id} data-off={!a.active || undefined} data-ticked={a.id === selected || undefined}>
                    <th scope="row"><button type="button" className="ac-link" aria-pressed={a.id === selected}
                      onClick={() => selectActivity(a.id === selected ? null : a.id)}>{a.name}</button></th>
                    <td>{lane.get(a.lane) ?? a.lane}</td><td>{a.instances === null ? 'Case' : `× ${a.instances}`}</td><td>{a.placement.text}</td>
                    <td className="ac-studio-num">{a.cost.amount === null ? '—' : fmtEurK(a.cost.amount)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
          <aside className="ac-studio-side" aria-label="Programme activity">
            {isProgrammeId(selected) ? <ParamPanel v={v} id={selected as string} /> : <section className="ac-studio-card"><p
              className="ac-muted">Select an activity in
              the list to see and edit its description, role, timing, cost and parameters.</p></section>}
          </aside>
        </div>
      )}
    </div>
  );
});
