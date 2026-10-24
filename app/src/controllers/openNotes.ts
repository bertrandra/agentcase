/** @calc-zone exports */
import { correctionsSummary } from '@/store/persistence/schema';

/**
 * The corrections made when the last file was opened (`store/persistence/schema`: damaged values replaced by defaults). Like the staleness banner, this
 * lives in the controller, outside the document and the undo history: every open replaces it, Dismiss clears it. Empty after a sound file.
 */
export interface OpenNotes { summary: string; notes: readonly string[] }
let current: OpenNotes | null = null;
const subs = new Set<() => void>();

export const getOpenNotes = (): OpenNotes | null => current;
export const onOpenNotes = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f); }; };
const set = (n: OpenNotes | null) => { current = n; subs.forEach((f) => f()); };
/** Record the corrections of the file just opened (an empty list clears the notice). */
export function setOpenNotes(notes: readonly string[]): void {
  const summary = correctionsSummary(notes);
  set(summary ? { summary, notes: [...notes] } : null);
}
export const dismissOpenNotes = (): void => { if (current) set(null); };
