import './rich.css';
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface StripTab { id: string; label: ReactNode }

/** Ids tying a tab strip to its panel (the panel may live in another zone of the section). */
export const stripIds = (base: string, current: string) => ({ panel: `${base}-p`, tab: `${base}-t-${current}` });

/**
 * WAI-ARIA tablist: roving tabindex, ←/→/Home/End move and select, every tab controls the one panel (`<TabPanel>` with the same `base`).
 * Controlled: the caller owns the selection.
 */
export function TabStrip({ tabs, value, onChange, label, base, className = 'ac-tabs' }: { tabs: StripTab[]; value: string; onChange: (id: string) => void; label: string; base: string; className?: string }) {
  const list = useRef<HTMLDivElement>(null), at = Math.max(0, tabs.findIndex((t) => t.id === value)), n = tabs.length;
  const onKey = (e: KeyboardEvent) => {
    const next = e.key === 'ArrowRight' ? (at + 1) % n : e.key === 'ArrowLeft' ? (at - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1, t = tabs[next];
    if (!t) return;
    e.preventDefault(); onChange(t.id);
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus());
  };
  return (
    <div className={className} role="tablist" aria-label={label} ref={list} onKeyDown={onKey}>
      {tabs.map((t, i) => (
        <button key={t.id} type="button" role="tab" id={`${base}-t-${t.id}`} aria-selected={i === at} aria-controls={`${base}-p`} tabIndex={i === at ? 0 : -1} onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </div>
  );
}

/** The panel of a TabStrip. */
export function TabPanel({ base, current, children }: { base: string; current: string; children: ReactNode }) {
  const ids = stripIds(base, current);
  return <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>{children}</div>;
}

/** A stable id base for a strip. */
export const useStripBase = (): string => useId();
