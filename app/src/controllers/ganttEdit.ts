/** @calc-zone delivery-views */
import { moveStart, resizeBar } from '@/domain/verifyB';
import { editBase } from '@/store/editBase';
import { setInput } from './inputs';

export interface BarKey { name: string; input: string; current: number; mode: 'resize' | 'move'; dir: 1 | -1; big: boolean }

/**
 * Keyboard editing of a Gantt program bar. The bars are derived from case inputs, so a key press edits the input behind the bar through
 * `setInput` (undoable; presses within the coalescing window merge into one step per input). `current` is the bar's value as the view shows it
 * (the model default applies when the document does not carry the input). The start moves from the value of the case the edit goes to
 * (`editBase`: the common value with "Change: All products"), never from another product's. Returns the announcement, or '' when nothing changed.
 */
export function nudgeBar(k: BarKey): string {
  const n = k.mode === 'resize' ? resizeBar(k.input, k.current, k.dir, k.big) : moveStart(editBase().dom.values.rmStart ?? '', k.dir, k.big);
  if (!n) return '';
  setInput(n.id, n.value);
  return `${k.name}: ${n.text}`;
}
