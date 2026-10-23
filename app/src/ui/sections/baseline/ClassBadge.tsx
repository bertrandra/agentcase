import { Badge } from '@/ui/widgets/cards';
import { tok } from '@/domain/theme';

const TONE = { Local: 'blue', Nearshore: 'teal', Offshore: 'amber' } as const;
export const CLASS_COLOR = { get Local() { return tok('info-700'); }, get Nearshore() { return tok('teal-700'); }, get Offshore() { return tok('warning-600'); } } as const;
export const classColor = (cls: string): string => CLASS_COLOR[cls as keyof typeof CLASS_COLOR] ?? CLASS_COLOR.Local;

/** Location classification badge (Local / Nearshore / Offshore). */
export const ClassBadge = ({ cls }: { cls: string }) => <Badge tone={TONE[cls as keyof typeof TONE] ?? 'grey'}>{cls}</Badge>;
