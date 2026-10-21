import { Badge } from '@/ui/widgets/cards';

const TONE = { Local: 'blue', Nearshore: 'teal', Offshore: 'amber' } as const;
export const CLASS_COLOR = { Local: '#1DB8F2', Nearshore: '#00828E', Offshore: '#BE4D00' } as const;
export const classColor = (cls: string): string => CLASS_COLOR[cls as keyof typeof CLASS_COLOR] ?? CLASS_COLOR.Local;

/** Location classification badge (Local / Nearshore / Offshore). */
export const ClassBadge = ({ cls }: { cls: string }) => <Badge tone={TONE[cls as keyof typeof TONE] ?? 'grey'}>{cls}</Badge>;
