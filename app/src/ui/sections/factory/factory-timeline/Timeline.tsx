import { LANES, timelineAxis, timelineEvents } from '@/domain/factory/timeline';
import { Panel } from '@/ui/widgets/cards';
import { useKpiData } from '../data';
import { cssVars } from '@/ui/cssVars';

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
      <div className="ac-tl-axis">
        <div className="ac-muted ac-tl-name">Calendar →</div>
        <div className="ac-tl-track">
          {/* dynamic: each tick and dot sits at its date on the axis */}
          {ax.ticks.map((k) => <span key={k.at} className="ac-tl-tick" style={cssVars({ '--dyn-at': `${k.at.toFixed(2)}%` })}>{short(k.t)}</span>)}
        </div>
      </div>
      {LANES.map((lane) => {
        const mine = events.filter((e) => e.lane === lane);
        return (
          <div key={lane} role="group" aria-label={lane} className="ac-tl-lane">
            <div className="ac-tl-name ac-small">{lane} <span className="ac-muted">({mine.length})</span></div>
            <div className="ac-tl-track ac-tl-dots">
              {mine.map((e, i) => (
                <span key={i} title={`${e.label} — ${e.date}`} className="ac-tl-dot" data-tone={e.tone} style={cssVars({ '--dyn-at': `${ax.pct(e.t).toFixed(2)}%` })} />
              ))}
            </div>
          </div>
        );
      })}
      <p className="ac-muted">{events.length} dated event(s) across {new Date(ax.min).toLocaleDateString()} – {new Date(ax.max).toLocaleDateString()}. Hover a dot for details.</p>
    </Panel>
  );
}
