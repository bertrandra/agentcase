import { Badge } from '@/ui/widgets/cards';
import type { TokenName } from '@/domain/theme';

const TONE = { Local: 'blue', Nearshore: 'teal', Offshore: 'amber' } as const;
/** The colour role of each location class (resolve with `useTheme().tok`, or as `var(--ac-<role>)` in CSS). */
export const CLASS_TONE = { Local: 'info-700', Nearshore: 'teal-700', Offshore: 'warning-600' } as const satisfies Record<string, TokenName>;
export const classTone = (cls: string): TokenName => CLASS_TONE[cls as keyof typeof CLASS_TONE] ?? CLASS_TONE.Local;

/** Location classification badge (Local / Nearshore / Offshore). */
export const ClassBadge = ({ cls }: { cls: string }) => <Badge tone={TONE[cls as keyof typeof TONE] ?? 'grey'}>{cls}</Badge>;
