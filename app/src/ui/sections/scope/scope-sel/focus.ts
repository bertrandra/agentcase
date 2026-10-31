import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import type { PhaseRow } from '@/domain';

/**
 * View state of the 🎯 Scope section (never in the case, never undoable): the artefact a link of the 🧩 Process section asked to show (its row
 * highlighted, scrolled to and given the keyboard focus), like the Process section's own selection (`selectActivity`).
 */
export const scopeFocus = createStore<{ id: string | null }>(() => ({ id: null }));
export const useScopeFocus = (): string | null => useSyncExternalStore(scopeFocus.subscribe, () => scopeFocus.getState().id);
export const focusArtefact = (id: string | null): void => scopeFocus.setState({ id });

const holds = (r: PhaseRow, id: string, shown: boolean): boolean =>
  (shown ? [...r.sdlcShown, ...r.regShown] : [...r.sdlc, ...r.reg]).some((a) => a.id === id);

/**
 * The rows `shown` with the focused artefact kept in sight: "show selected only" may hide it (or its whole phase), so it is added back to its
 * phase (`all`: the rows without that filter). Unchanged when nothing is focused, when it is shown, or when no phase lists it.
 */
export function withFocused(shown: PhaseRow[], all: PhaseRow[], id: string | null): PhaseRow[] {
  if (!id || shown.some((r) => holds(r, id, true))) return shown;
  const home = all.find((r) => holds(r, id, false));
  if (!home) return shown;
  const add = (r: PhaseRow): PhaseRow => ({ ...r, sdlcShown: [...r.sdlcShown, ...r.sdlc.filter((a) => a.id === id)],
    regShown: [...r.regShown, ...r.reg.filter((a) => a.id === id)] });
  const kept = new Set(shown.map((r) => r.phase.id));
  return all.filter((r) => kept.has(r.phase.id) || r === home).map((r) => {
    const s = shown.find((x) => x.phase.id === r.phase.id);
    return r === home ? add(s ?? { ...r, sdlcShown: [], regShown: [] }) : s ?? r;
  });
}
