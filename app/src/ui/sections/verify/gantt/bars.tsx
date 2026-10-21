import type { ReactNode } from 'react';

const hexRgba = (h: string, a: number): string => {
  const n = parseInt(h.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const pct = (v: number) => `${v.toFixed(2)}%`;

/** One row of the shared calendar: a fixed-width label column and the bar track. */
export function Row({ label, height, indent = 0, bg, title, children }: { label: ReactNode; height: number; indent?: number; bg?: string; title?: string; children: ReactNode }) {
  return (
    <div data-gantt-row="" style={{ display: 'flex', alignItems: 'center', height, borderBottom: '1px solid #eff2f8', background: bg }}>
      <div title={title} style={{ width: 260, flex: 'none', fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8, paddingLeft: indent }}>{label}</div>
      {children}
    </div>
  );
}

/** Translucent activity span with the solid human-supervision subset on top. Derived from effort weights, so a focusable read-only group (not editable). */
export function DualBar({ left, act, sup, color, title }: { left: number; act: number; sup: number; color: string; title: string }) {
  const base = { position: 'absolute' as const, top: 0, height: 16, left: pct(left) };
  return (
    <div title={title} role="group" aria-label={title} tabIndex={0} style={{ position: 'relative', flex: 1, height: 16, background: '#F4F6FB', borderRadius: 3 }}>
      <div style={{ ...base, borderRadius: 3, width: pct(act), background: hexRgba(color, 0.4) }} />
      <div style={{ ...base, borderRadius: '3px 0 0 3px', width: pct(sup), background: color }} />
    </div>
  );
}
export { hexRgba };
