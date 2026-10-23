import { updateTheme } from '@/controllers/themes';
import { AXES, AXIS_NAMES, axisValues, type AxisName } from '@/domain/theme/axes';
import type { ThemeDef } from '@/domain/theme/themeDef';

const GROUPS = [...new Set(AXIS_NAMES.map((k) => AXES[k].group))];

/** The theme axes (docs/THEME.md §6), built from AXES: shape, box style, density, typography, control variants. */
export function AxesEditor({ def }: { def: ThemeDef }) {
  return (
    <>
      {GROUPS.map((g) => (
        <details key={g}>
          <summary>{g}</summary>
          <div className="ac-bt-axes">
            {AXIS_NAMES.filter((k) => AXES[k].group === g).map((k) => <AxisSelect key={k} k={k} def={def} />)}
          </div>
        </details>
      ))}
    </>
  );
}

function AxisSelect({ k, def }: { k: AxisName; def: ThemeDef }) {
  const a = AXES[k], value = (def.axes[k] ?? a.default) as string, labels = a.labels as Record<string, string>;
  return (
    <label className="ac-field">
      <span className="ac-field-l">{a.label}</span>
      <select value={value} onChange={(e) => updateTheme(def.seq, { axes: { [k]: e.target.value } })}>
        {axisValues(k).map((v) => <option key={v} value={v}>{labels[v]}{v === a.default ? ' (default)' : ''}</option>)}
      </select>
    </label>
  );
}
