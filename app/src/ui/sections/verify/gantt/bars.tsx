import type { ReactNode } from 'react';
import type { TokenName } from '@/domain/theme';
import { useTheme } from '@/ui/themeContext';

const pct = (v: number) => `${v.toFixed(2)}%`;

/** One row of the shared calendar: a fixed-width label column and the bar track. */
export function Row({ label, height, indent = 0, bg, title, children }: { label: ReactNode; height: number; indent?: number; bg?: string; title?: string; children: ReactNode }) {
  return (
    <div data-gantt-row="" style={{ display: 'flex', alignItems: 'center', height, borderBottom: '1px solid var(--ac-slate-75)', background: bg }}>
      <div title={title} style={{ width: 260, flex: 'none', fontSize: 'var(--ac-font-size-sm-plus)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8, paddingLeft: indent }}>{label}</div>
      {children}
    </div>
  );
}

/** Translucent activity span with the solid human-supervision subset on top. Derived from effort weights, so a focusable read-only group (not editable). */
export function DualBar({ left, act, sup, tone, title }: { left: number; act: number; sup: number; tone: TokenName; title: string }) {
  const { alpha } = useTheme(), base = { position: 'absolute' as const, top: 0, height: 16, left: pct(left) };
  return (
    <div title={title} role="group" aria-label={title} tabIndex={0} style={{ position: 'relative', flex: 1, height: 16, background: 'var(--ac-slate-55)', borderRadius: 'var(--ac-radius-xs)' }}>
      <div style={{ ...base, borderRadius: 'var(--ac-radius-xs)', width: pct(act), background: alpha(tone, 0.4) }} />
      <div style={{ ...base, borderRadius: 'var(--ac-radius-xs) 0 0 var(--ac-radius-xs)', width: pct(sup), background: `var(--ac-${tone})` }} />
    </div>
  );
}

/** The calendar header of a Gantt: the label column, then one tick per label at its position (% of the calendar). */
export function CalendarHeader({ ticks }: { ticks: { left: number; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 18, marginBottom: 2 }}>
      <div style={{ width: 260, flex: 'none', fontSize: 'var(--ac-font-size-xs)', color: 'var(--ac-neutral-700)' }}>Calendar →</div>
      <div style={{ position: 'relative', flex: 1, height: 18 }}>
        {ticks.map((t) => (
          <div key={t.left} style={{ position: 'absolute', left: `${t.left.toFixed(2)}%`, top: 0, bottom: 0, borderLeft: '1px solid var(--ac-slate-200)' }}>
            <span style={{ position: 'absolute', top: -16, left: 2, fontSize: 'var(--ac-font-size-xs)', color: 'var(--ac-neutral-700)', whiteSpace: 'nowrap' }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
