import { Stat, StatRow } from '@/ui/widgets/cards';

/** A summary band: label/value pairs shown as a row of figures (legacy `.summary-band`). */
export function Band({ items, tone = 'blue' }: { items: [string, string][]; tone?: 'blue' | 'teal' | 'brick' | 'amber' | 'grey' }) {
  return <StatRow>{items.map(([label, value], i) => <Stat key={`${i}:${label}`}label={label} value={value} tone={tone} />)}</StatRow>;
}
