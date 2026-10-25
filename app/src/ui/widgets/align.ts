/** The alignment of a table column: its data decision (a numeric column is right-aligned). */
export type Align = 'left' | 'right' | 'center';

/**
 * The theme class of a column alignment (D5, `theme/sections-b.css`): `ac-num` a numeric column (right-aligned, figures font), `ac-center` centred;
 * left is the table's own alignment (no class).
 */
export const alignClass = (a: Align = 'left'): string | undefined => (a === 'right' ? 'ac-num' : a === 'center' ? 'ac-center' : undefined);
