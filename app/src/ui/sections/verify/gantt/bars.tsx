import type { ReactNode } from 'react';
import { alpha } from '@/domain/theme';

const hexRgba = (h: string, a: number): string => alpha(h, a);
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
export function DualBar({ left, act, sup, color, title }: { left: number; act: number; sup: number; color: string; title: string }) {
  const base = { position: 'absolute' as const, top: 0, height: 16, left: pct(left) };
  return (
    <div title={title} role="group" aria-label={title} tabIndex={0} style={{ position: 'relative', flex: 1, height: 16, background: 'var(--ac-slate-55)', borderRadius: 'var(--ac-radius-xs)' }}>
      <div style={{ ...base, borderRadius: 'var(--ac-radius-xs)', width: pct(act), background: hexRgba(color, 0.4) }} />
      <div style={{ ...base, borderRadius: 'var(--ac-radius-xs) 0 0 var(--ac-radius-xs)', width: pct(sup), background: color }} />
    </div>
  );
}
export { hexRgba };
