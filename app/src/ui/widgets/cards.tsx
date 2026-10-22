import type { ReactNode } from 'react';

type Tone = 'blue' | 'teal' | 'brick' | 'amber' | 'grey';

/** A figure with its label (results strips). */
export function Stat({ label, value, tone = 'blue', hint }: { label: string; value: string; tone?: Tone; hint?: string }) {
  return <div className="ac-stat" data-tone={tone} title={hint}><span className="ac-stat-v">{value}</span><span className="ac-stat-l">{label}</span></div>;
}
export const StatRow = ({ children }: { children: ReactNode }) => <div className="ac-stat-row">{children}</div>;

/** A callout box: note (the legacy insight box), warning or error; `green` / `blue` are the legacy reassurance and cross-reference notes. */
export function Callout({ kind = 'note', children }: { kind?: 'note' | 'warn' | 'error' | 'green' | 'blue'; children: ReactNode }) {
  return <div className={`ac-callout ac-callout-${kind}`} role={kind === 'warn' || kind === 'error' ? 'alert' : 'note'}>{children}</div>;
}

export const Badge = ({ children, tone = 'grey' }: { children: ReactNode; tone?: Tone }) => <span className="ac-badge" data-tone={tone}>{children}</span>;

/** A titled block inside a zone. */
export function Panel({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="ac-panel"><header><h2>{title}</h2>{aside}</header>{children}</section>;
}
