import { render } from '@testing-library/react';
import { programmeActivityId } from '@/domain/programme';
import { ProgrammePart } from '@/ui/sections/scope/process/programme/ProgrammePart';
import { processView } from '@/ui/sections/scope/process/view';

/**
 * Phase B9a (docs/SPEC_BPMN.md § 19.7, DEV-B9A-CONTEXT-SCREENS): the programme part of the 🧩 Process section with an activity selected, its
 * parameter panel open — where the activity's fields (and their knowledge-subset chips, the knowledge-transfer preparation) are edited now.
 */
export function renderProgrammePanel(kind: string): ReturnType<typeof render> {
  processView.setState({ selected: programmeActivityId(kind) });
  return render(<ProgrammePart />);
}
