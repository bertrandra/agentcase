import { appStore } from '@/store/instance';

/** Undo / redo — the only way the UI moves through history. Both return the label of the step they moved, or null. */
export function undo(): string | null {
  const e = appStore().getState().history.undo.at(-1);
  return e && appStore().undo() ? e.label : null;
}
export function redo(): string | null {
  const e = appStore().getState().history.redo.at(-1);
  return e && appStore().redo() ? e.label : null;
}
export const jumpToStep = (index: number): void => appStore().jumpTo(index);
