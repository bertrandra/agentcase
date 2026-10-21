import type { ReactNode } from 'react';
import { Badge } from '@/ui/widgets/cards';
import { Rich } from '@/ui/widgets/Rich';
import { SectionFrame } from '@/ui/zones/SectionFrame';

/** Shape of a content file under `src/content/refshare/`: title, optional version badge, help prose and optional static body. */
export interface SectionContent { title: string; version?: string; help: unknown[]; body?: unknown[] }

/** A documentation section rendered entirely from a content file; `before` / `after` add live panels around the prose. */
export function StaticSection({ content, before, after, input }: { content: SectionContent; before?: ReactNode; after?: ReactNode; input?: ReactNode }) {
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={input ?? ((before || content.version) ? <>{content.version && <p><Badge tone="blue">{content.version}</Badge></p>}{before}</> : undefined)}
      result={<>{content.body && <Rich nodes={content.body} />}{after}</>} />
  );
}
