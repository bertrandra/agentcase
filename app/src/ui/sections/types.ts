import type { ComponentType } from 'react';

export type SectionMap = Record<string, () => Promise<{ default: ComponentType }>>;
