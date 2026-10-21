import { Stat } from '@/ui/widgets/cards';

type Tone = 'blue' | 'teal' | 'brick' | 'amber' | 'grey';

/** A Results figure: label, value and an optional sub-line (kept in the DOM so it is read with the figure). */
export function Kpi({ label, value, tone, sub }: { label: string; value: string; tone: Tone; sub?: string }) {
  return <Stat label={sub ? `${label} — ${sub}` : label} value={value} tone={tone} hint={sub} />;
}
