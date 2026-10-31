import type { KeyboardEvent } from 'react';
import { nudgeBar } from '@/controllers/ganttEdit';
import type { GanttView } from '@/domain/verifyB';
import { toast } from '@/ui/uiState';
import { openActivity } from '@/ui/widgets/ActivityRefs';

type Row = GanttView['program'][number];
const KEYS: Record<string, 1 | -1> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
const pct = (v: number) => `${v.toFixed(2)}%`;
const HINT = 'Enter opens the activity in the Process section; Alt plus arrow keys move the roadmap start, Shift for bigger steps';

/**
 * A program bar: a focusable read-only group (its name, dates and duration). The activity behind it is a programme activity (SPEC_BPMN § 19.7
 * F-B71, phase B9a): its duration is edited in the Process section's parameter panel, which Enter (or a click) opens. Alt+arrows still shift the
 * roadmap start, a case-level date (Shift: a week).
 */
export function ProgramBar({ r }: { r: Row }) {
  const text = `${r.name}, ${r.range}, ${r.meta}`;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); openActivity(r.activity); return; }
    const dir = KEYS[e.key];
    if (!dir || !e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const msg = nudgeBar({ name: r.name, dir, big: e.shiftKey });
    if (msg) toast(msg);
  };
  // dynamic: place and length on the calendar, and the bar's colour role (any theme token, from the domain)
  const place = { left: pct(r.left), width: pct(r.w), background: `var(--ac-${r.tone})` };
  return (
    <div className="ac-gantt-track is-program">
      {/* dynamic: place, length and colour role (above) */}
      <div title={`${r.name} — ${r.meta}`} tabIndex={0} onKeyDown={onKey} onClick={() => openActivity(r.activity)} className="ac-gantt-pbar" style={place}
        role="group" aria-label={text} aria-keyshortcuts="Enter Alt+ArrowLeft Alt+ArrowRight" aria-description={HINT} />
    </div>
  );
}
