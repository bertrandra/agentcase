/** @calc-zone delivery-views */
import type { ActivityView } from '../process/readTypes';
import { linkedSection } from './activityMeta';
import type { ProgrammeView } from './model';

/**
 * Where the details of an element selected in the 🧩 Process section live (docs/SPEC_BPMN.md § 19.7, "links from the map"): the ONE map of
 * element kind → detail screen every "Open …" link of the Process panels reads, and the reverse links come back to the Process section.
 * A delivery activity is an artefact of the case: its row in 🎯 Scope lists and edits it (a regulatory one also needs its norm, chosen in
 * 🏛️ Industry / regulatory profile); a programme activity, milestone or gate has its row in 📋 Programme (then its context section,
 * `LINKED_SECTION`); a wave sits on the 📅 Plan. View only: no figure, no document change.
 */
export type DetailKind = 'sdlc' | 'regulatory' | 'programme' | 'milestone' | 'gate' | 'wave';
export const DETAIL_SECTIONS: Readonly<Record<DetailKind, readonly string[]>> = {
  sdlc: ['scope-sel'], regulatory: ['scope-sel', 'transform-params'], programme: ['programme'], milestone: ['programme'], gate: ['programme'],
  wave: ['gantt'],
};
export interface ActivityDetail {
  kind: DetailKind;
  /** the detail screen first (the one that focuses the element's row), then the other screens that hold its context */
  sections: string[];
}
type Programme = Pick<ProgrammeView, 'activities' | 'milestones' | 'waves'>;
const NO_PROGRAMME: Programme = { activities: [], milestones: [], waves: [] };

/** The detail kind and screens of element `id` of the delivery process `delivery` or of the programme `programme`; null for anything else. */
export function activityDetail(id: string, delivery: readonly Pick<ActivityView, 'id' | 'regulatory'>[], programme: Programme = NO_PROGRAMME):
  ActivityDetail | null {
  const d = delivery.find((a) => a.id === id);
  if (d) { const kind = d.regulatory ? 'regulatory' : 'sdlc'; return { kind, sections: [...DETAIL_SECTIONS[kind]] }; }
  const p = programme.activities.find((a) => a.id === id), m = p ? undefined : programme.milestones.find((x) => x.id === id);
  const kind: DetailKind | null = p ? 'programme' : m ? (m.element === 'gateway' ? 'gate' : 'milestone')
    : programme.waves.some((w) => w.id === id) ? 'wave' : null;
  if (!kind) return null;
  const linked = linkedSection((p ?? m)?.kind ?? ''), sections = [...DETAIL_SECTIONS[kind]];
  return { kind, sections: linked && !sections.includes(linked) ? [...sections, linked] : sections };
}
