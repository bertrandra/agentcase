import type { ReactNode } from 'react';
import type { TokenName } from '@/domain/theme';
import { useTheme } from '@/ui/themeContext';

const pct = (v: number) => `${v.toFixed(2)}%`;

/** The look of a calendar row: a program row (21 px), a phase / wave header (tinted), a cross-cutting header (amber tint) or a plain row. */
export type RowKind = 'program' | 'phase' | 'cross';
interface RowProps { label: ReactNode; kind?: RowKind; indent?: boolean; title?: string; children: ReactNode }

/** One row of the shared calendar: a fixed-width label column and the bar track. */
export function Row({ label, kind, indent, title, children }: RowProps) {
  const cls = ['ac-gantt-row', kind && `is-${kind}`, indent && 'is-indented'].filter(Boolean).join(' ');
  return (
    <div data-gantt-row="" className={cls}>
      <div title={title} className="ac-gantt-label">{label}</div>
      {children}
    </div>
  );
}

/**
 * Translucent activity span with the solid human-supervision subset on top. Derived from effort weights, so a focusable read-only group (not
 * editable).
 */
export function DualBar({ left, act, sup, tone, title }: { left: number; act: number; sup: number; tone: TokenName; title: string }) {
  const { alpha } = useTheme();
  return (
    <div title={title} role="group" aria-label={title} tabIndex={0} className="ac-gantt-track">
      {/* dynamic: place and length on the calendar; the phase's colour role (its activity tint is a computed alpha of it) */}
      <div className="ac-gantt-act" style={{ left: pct(left), width: pct(act), background: alpha(tone, 0.4) }} />
      <div className="ac-gantt-sup" style={{ left: pct(left), width: pct(sup), background: `var(--ac-${tone})` }} />
    </div>
  );
}

/** The calendar header of a Gantt: the label column, then one tick per label at its position (% of the calendar). */
export function CalendarHeader({ ticks }: { ticks: { left: number; label: string }[] }) {
  return (
    <div className="ac-gantt-calendar">
      <div className="ac-gantt-calendar-l">Calendar →</div>
      <div className="ac-gantt-ticks">
        {ticks.map((t) => (
          // dynamic: the tick's place on the calendar
          <div key={t.left} className="ac-gantt-tick" style={{ left: `${t.left.toFixed(2)}%` }}>
            <span className="ac-gantt-tick-l">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
