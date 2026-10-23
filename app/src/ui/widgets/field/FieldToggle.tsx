import type { ReactNode } from 'react';
import { useThemeAxis } from '@/ui/themeAxes';

export interface FieldToggleProps {
  label: ReactNode; checked: boolean; onChange: (on: boolean) => void; hint?: ReactNode; disabled?: boolean;
  /** Accessible name when the visible label is not plain text (or absent). */
  ariaLabel?: string;
  /** The checkbox as rendered before T3 (the default variant). */
  children: ReactNode;
}

/**
 * Yes / no: checkbox (the native rendering) or switch, chosen by the `controlsBoolean` theme axis. The switch is the same native checkbox with
 * `role="switch"` (Space toggles it, the state is announced as on / off), so it commits through the same `onChange`.
 */
export function FieldToggle(p: FieldToggleProps) {
  const axis = useThemeAxis('controlsBoolean');
  if (axis !== 'switch') return <>{p.children}</>;
  return (
    <label className="ac-check ac-fv-switch">
      <input type="checkbox" role="switch" aria-checked={p.checked} aria-label={p.ariaLabel} checked={p.checked} disabled={p.disabled} onChange={(e) => p.onChange(e.target.checked)} />
      <span>{p.label}{p.hint && <span className="ac-field-h"> — {p.hint}</span>}</span>
    </label>
  );
}
