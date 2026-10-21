import type { KeyboardEvent } from 'react';
import { nudgeBar } from '@/controllers/ganttEdit';
import { BAR_SPECS, type GanttView } from '@/domain/verifyB';
import { toast } from '@/ui/uiState';

type Row = GanttView['program'][number];
const KEYS: Record<string, 1 | -1> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
const pct = (v: number) => `${v.toFixed(2)}%`;
const HINT = 'Arrow keys resize, Alt plus arrow keys move the roadmap start, Shift for bigger steps';

/**
 * A program bar. When a case input sizes it, the bar is a slider over that input (value = duration in the input's unit, text = dates):
 * arrows resize, Alt+arrows shift the roadmap start, Shift enlarges the step. Derived bars (Run rows) are a focusable read-only group.
 */
export function ProgramBar({ r }: { r: Row }) {
  const spec = r.input ? BAR_SPECS[r.input] : undefined, text = `${r.name}, ${r.range}, ${r.meta}`;
  const onKey = (e: KeyboardEvent) => {
    const dir = KEYS[e.key];
    if (!dir || !r.input || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const msg = nudgeBar({ name: r.name, input: r.input, current: r.value ?? 0, mode: e.altKey ? 'move' : 'resize', dir, big: e.shiftKey });
    if (msg) toast(msg);
  };
  const base = { position: 'absolute' as const, top: 0, height: 14, borderRadius: 3, left: pct(r.left), width: pct(r.w), background: r.color };
  const aria = spec ? { role: 'slider', 'aria-valuemin': spec.min, 'aria-valuemax': spec.max, 'aria-valuenow': r.value, 'aria-valuetext': text, 'aria-label': `${r.name} duration in ${spec.unit}`,
    'aria-keyshortcuts': 'ArrowLeft ArrowRight Alt+ArrowLeft Alt+ArrowRight', 'aria-description': HINT } : { role: 'group', 'aria-label': text };
  return (
    <div style={{ position: 'relative', flex: 1, height: 14, background: '#F4F6FB', borderRadius: 3 }}>
      <div title={`${r.name} — ${r.meta}`}tabIndex={0} onKeyDown={onKey} style={base} {...aria} />
    </div>
  );
}
