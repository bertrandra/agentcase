import type { ReactNode } from 'react';
import { Callout } from '@/ui/widgets/cards';

/** Shared bits of the six Model-Engine sections (P1-P6). */
export { fmtK, fmtEur } from '@/ui/format';
export const pct1 = (v: number): string => `${(v * 100).toFixed(1)}%`;

/** Enable / disable button of a phase. */
export function PhaseSwitch({ on, phase, onToggle }: { on: boolean; phase: string; onToggle: () => void }) {
  return <button type="button" data-tone={on ? 'danger' : 'primary'} onClick={onToggle}>{on ? `Disable ${phase}` : `Enable ${phase}`}</button>;
}

/** Phase ON / OFF banner. */
export function PhaseBanner({ on, children, off }: { on: boolean; children: ReactNode; off: ReactNode }) {
  return <Callout>{on ? <>Phase <strong>ON</strong>. {children}</> : <>Phase <strong>OFF</strong>{off}</>}</Callout>;
}

/** A coloured read-out tile (ρmax, WIP, ...). */
export function Tile({ label, value, note, tone = 'blue' }: { label: string; value: ReactNode; note?: string; tone?: 'blue' | 'teal' | 'amber' | 'brick' | 'purple' }) {
  return (
    <div className="ac-stat" data-tone={tone === 'purple' ? 'grey' : tone} style={{ minWidth: 140 }}>
      <span className="ac-stat-l" style={{ textTransform: 'uppercase' }}>{label}</span><span className="ac-stat-v">{value}</span>{note && <span className="ac-stat-l">{note}</span>}
    </div>
  );
}
