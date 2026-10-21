import { SectionFrame } from './SectionFrame';
import type { SectionDef } from './registry';

/** Shown for sections that are not migrated yet (they still live in the legacy single-file app). */
export function Placeholder({ section }: { section: SectionDef }) {
  return (
    <SectionFrame title={section.label} input={
      <p className="ac-muted">{section.description}<br /><em>This section has not been migrated to the TypeScript build yet — open the legacy app for it.</em></p>
    } />
  );
}
