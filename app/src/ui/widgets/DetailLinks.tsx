import type { ActivityDetail } from '@/domain/programme';
import { focusRow } from '@/ui/sections/scope/programme/view';
import { focusArtefact } from '@/ui/sections/scope/scope-sel/focus';
import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';
import './activity-refs.css';

/** How a detail screen shows one element (its row selected and focused): view state only, never undoable. Screens without one just open. */
const FOCUS: Readonly<Record<string, (id: string) => void>> = { 'scope-sel': focusArtefact, programme: focusRow };
const label = (section: string): string => sectionById(section)?.label ?? section;

/** Open detail screen `section` focused on element `id` (its row highlighted, scrolled to, keyboard focus on it). */
export function openDetail(section: string, id: string): void {
  FOCUS[section]?.(id);
  goSection(section);
}

/**
 * The links of a 🧩 Process panel to where the selected element's details live (docs/SPEC_BPMN.md § 19.7; the map is the domain's
 * `activityDetail`): the detail screen first, focused on the element's row ("Open X in 🎯 Scope", "Open X in 📋 Programme"), then the screens
 * that hold its context (the norm of a regulatory artefact, the linked section of a programme activity). Each screen links back (Open in Process).
 */
export function DetailLinks({ id, name, detail }: { id: string; name: string; detail: ActivityDetail | null }) {
  if (!detail) return null;
  const [first, ...rest] = detail.sections;
  if (!first) return null;
  return (
    <p className="ac-detail-links">
      <span className="ac-muted">Details:</span>{' '}
      <button type="button" className="ac-link" onClick={() => openDetail(first, id)}>{`Open ${name} in ${label(first)}`}</button>
      {rest.map((s) => <span key={s}>{' · '}<button type="button" className="ac-link" onClick={() => goSection(s)}>{`Open ${label(s)}`}</button></span>)}
    </p>
  );
}
