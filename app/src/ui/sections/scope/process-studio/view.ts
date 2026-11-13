import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';

/**
 * View state of the 🗺️ Process studio (never in the case, never undoable): the open tab, the phase in focus, the colouring, whether out-of-scope
 * activities are shown, the activity table's saved view, its folded phases and ticked rows, and the sub-views of the roles and programme tabs.
 * The selected activity is the 🧩 Process section's (`selectActivity`), so both sections and the BPMN canvas show the same selection.
 */
export type StudioTab = 'map' | 'phase' | 'activities' | 'roles' | 'bpmn' | 'programme';
export type TableView = 'scope' | 'all' | 'agent' | 'human' | 'regulatory';
export interface StudioView {
  tab: StudioTab; phase: string | null; colour: 'type' | 'authority'; mapColour: 'scope' | 'effort'; showOff: boolean;
  view: TableView; open: Record<string, boolean>; ticked: string[]; rolesView: 'raci' | 'decisions'; progView: 'timeline' | 'bpmn';
}
const INITIAL: StudioView = { tab: 'map', phase: null, colour: 'type', mapColour: 'scope', showOff: false, view: 'scope', open: {}, ticked: [],
  rolesView: 'raci', progView: 'timeline' };
export const studioView = createStore<StudioView>(() => INITIAL);
export const useStudio = <T,>(f: (s: StudioView) => T): T => useSyncExternalStore(studioView.subscribe, () => f(studioView.getState()));
export const resetStudio = (): void => studioView.setState(INITIAL, true);
export const setStudio = (patch: Partial<StudioView>): void => studioView.setState(patch);
/** Open a phase in the Phase focus tab. */
export const focusPhase = (phase: string): void => studioView.setState({ tab: 'phase', phase });
export const toggleTick = (id: string): void => studioView.setState((s) => ({
  ticked: s.ticked.includes(id) ? s.ticked.filter((x) => x !== id) : [...s.ticked, id] }));
export const toggleOpen = (phase: string, now: boolean): void => studioView.setState((s) => ({ open: { ...s.open, [phase]: !now } }));
