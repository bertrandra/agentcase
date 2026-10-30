/** @calc-zone delivery-views */
import { moveStart } from '@/domain/verifyB';
import { editBase } from '@/store/editBase';
import { setInput } from './inputs';

export interface BarKey { name: string; dir: 1 | -1; big: boolean }

/**
 * Keyboard move of the Gantt roadmap start (Alt+arrows on a program bar): the start date, a case-level input, moves by a day (a week with
 * `big`) through `setInput` (undoable; presses within the coalescing window merge into one step). It moves from the value of the case the edit
 * goes to (`editBase`: the common value with "Change: All products"), never from another product's. The bars' durations are programme
 * activity parameters, edited in the Process section only (SPEC_BPMN § 19.7, phase B9a). Returns the announcement, or '' when nothing changed.
 */
export function nudgeBar(k: BarKey): string {
  const n = moveStart(editBase().dom.values.rmStart ?? '', k.dir, k.big);
  if (!n) return '';
  setInput(n.id, n.value);
  return `${k.name}: ${n.text}`;
}
