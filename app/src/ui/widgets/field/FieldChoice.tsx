import { useId, type ReactNode } from 'react';
import { useThemeAxis } from '@/ui/themeAxes';
import { FieldGroup } from './Field';

export interface FieldChoiceProps {
  label: string; hint?: ReactNode; value: string; options: readonly { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean;
  /** The dropdown as rendered before T3 (the default variant). */
  children: ReactNode;
  /** A table cell: no visible label, no field margins. */
  bare?: boolean;
}

/** Segmented buttons and radio groups only make sense for a short list; a longer one stays a dropdown. */
export const CHOICE_MAX = 5;

/**
 * A choice among 2 to 5 options: dropdown (the native rendering), segmented buttons or radio group, chosen by the `controlsChoice` theme axis.
 * Both variants are native radio buttons in a named `radiogroup` (arrow keys move and select, as the browser does); the segmented look only
 * hides the dot. Selecting commits through the same `onChange` as the dropdown.
 */
export function FieldChoice(p: FieldChoiceProps) {
  const id = useId(), axis = useThemeAxis('controlsChoice');
  if (axis === 'auto' || axis === 'dropdown' || p.options.length < 2 || p.options.length > CHOICE_MAX) return <>{p.children}</>;
  return (
    <FieldGroup id={id} role="radiogroup" label={p.label} hint={p.hint} bare={p.bare}>
      <span className={`ac-fv-opts ac-fv-${axis}`}>
        {p.options.map((o) => (
          <label key={o.value} className="ac-fv-opt">
            <input type="radio" name={id} value={o.value} checked={o.value === p.value} disabled={p.disabled} onChange={() => p.onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </span>
    </FieldGroup>
  );
}
