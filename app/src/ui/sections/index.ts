import type { ComponentType } from 'react';

/** Section id → component. Sections not listed here render the placeholder. Each entry is lazy so the single file stays lean. */
export const SECTION_COMPONENTS: Record<string, () => Promise<{ default: ComponentType }>> = {};
