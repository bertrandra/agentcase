/** @calc-zone workspace-config */
/**
 * Short messages the shell announces (an aria-live toast) about something that happened OUTSIDE a user action: another tab replaced or reshaped
 * the document (undo history cleared), the autosave could not be written. Outside the document and the undo history, like the open notes.
 */
export interface Notice { id: number; text: string }
let last: Notice | null = null, seq = 0;
const subs = new Set<() => void>();

export const getNotice = (): Notice | null => last;
export const onNotice = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Announce a message (each call is a new notice, even with the same text). */
export function notify(text: string): void {
  last = { id: ++seq, text };
  subs.forEach((f) => f());
}
