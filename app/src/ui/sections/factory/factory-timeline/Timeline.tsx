import { LANES, timelineAxis, timelineEvents } from '@/domain/factory/timeline';
import { Panel } from '@/ui/widgets/cards';
import { useKpiData } from '../data';

const ASIDE = <small className="ac-muted">Commits, Builds, Release Candidates, Approvals, Deployments, Monitoring, Feedback — by their real dates</small>;
const short = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Every dated Release-pipeline + Engineering event on one calendar axis, one swimlane per type (hover a dot for the label and date). */
export function Timeline() {
  const { data } = useKpiData();
  const events = timelineEvents(data);
  if (!events.length) {
    return <Panel title="🗓️ Release & Engineering timeline" aside={ASIDE}><p className="ac-muted">No dated factory events yet — add Commits/Builds in ⚙️ Engineering, or Release Candidates/Approvals/Deployments/Monitoring/Feedback in 🚀 Release Pipeline.</p></Panel>;
  }
  const ax = timelineAxis(events);
  return (
    <Panel title="🗓️ Release & Engineering timeline" aside={ASIDE}>
      <div style={{ display: 'flex', height: 16, marginBottom: 4 }}>
        <div style={{ width: 150, flex: 'none' }} className="ac-muted">Calendar →</div>
        <div style={{ position: 'relative', flex: 1 }}>{ax.ticks.map((k) => <span key={k.at} style={{ position: 'absolute', left: `${k.at.toFixed(2)}%`, fontSize: 'var(--ac-font-size-2xs-plus)', color: 'var(--ac-muted)', whiteSpace: 'nowrap' }}>{short(k.t)}</span>)}</div>
      </div>
      {LANES.map((lane) => {
        const mine = events.filter((e) => e.lane === lane);
        return (
          <div key={lane} role="group" aria-label={lane} style={{ display: 'flex', alignItems: 'center', height: 24, borderBottom: '1px solid var(--ac-line)' }}>
            <div style={{ width: 150, flex: 'none', fontSize: 'var(--ac-font-size-sm)' }}>{lane} <span className="ac-muted">({mine.length})</span></div>
            <div style={{ position: 'relative', flex: 1, height: 16 }}>
              {mine.map((e, i) => <span key={i} title={`${e.label} — ${e.date}`} style={{ position: 'absolute', left: `${ax.pct(e.t).toFixed(2)}%`, top: 3, width: 9, height: 9, borderRadius: 'var(--ac-radius-round)', background: e.color, transform: 'translateX(-50%)' }} />)}
            </div>
          </div>
        );
      })}
      <p className="ac-muted">{events.length} dated event(s) across {new Date(ax.min).toLocaleDateString()} – {new Date(ax.max).toLocaleDateString()}. Hover a dot for details.</p>
    </Panel>
  );
}
