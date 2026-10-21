import { Badge } from '@/ui/widgets/cards';

const TONE = { Local: 'blue', Nearshore: 'teal', Offshore: 'amber' } as const;
export const CLASS_COLOR = { Local: '#0a6e9c', Nearshore: '#006e79', Offshore: '#b04600' } as const;
export const classColor = (cls: string): string => CLASS_COLOR[cls as keyof typeof CLASS_COLOR] ?? CLASS_COLOR.Local;

/** Location classification badge (Local / Nearshore / Offshore). */
export const ClassBadge = ({ cls }: { cls: string }) => <Badge tone={TONE[cls as keyof typeof TONE] ?? 'grey'}>{cls}</Badge>;
