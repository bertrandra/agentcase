import type { ReactNode } from 'react';

export interface FrameProps {
  title: string; help?: ReactNode; input?: ReactNode; result?: ReactNode; diagnostic?: ReactNode;
  /**
   * override addresses (`selectedArtefacts`, `values.engagementCtx`, ...) this section edits: with 2+ products a "Product: X (inherited / n
   * overrides)" banner shows
   */
  overrides?: readonly string[];
}
