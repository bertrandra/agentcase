import { useMemo } from 'react';
import { duplicateTheme, lastIssuedSeq } from '@/controllers/themes';
import { themeChecks, themeTable } from '@/domain/theme/themeChecks';
import { ROLE_GROUPS, SCALE_KEYS, type ColourKey, type ThemeDef } from '@/domain/theme/themeDef';
import { Callout } from '@/ui/widgets/cards';
import { AxesEditor } from './AxesEditor';
import { ColourRow } from './ColourRow';
import { GeneratorPanel } from './GeneratorPanel';
import { RainbowLegend } from './RainbowLegend';
import { selectTheme, useBrandThemeView } from './selection';

const GROUPS: [string, readonly ColourKey[]][] = [['Brand scales', SCALE_KEYS], ...(Object.entries(ROLE_GROUPS) as [string, readonly ColourKey[]][])];

/** The editor of the selected theme: colours with live contrast badges, then the theme axes. Read-only for a built-in theme. */
export function Editor({ def }: { def: ThemeDef }) {
  const mode = useBrandThemeView((s) => (s.previewDark ? 'dark' : 'light'));
  const table = useMemo(() => themeTable(def, mode), [def, mode]);
  const checks = useMemo(() => new Map(themeChecks(def, mode).map((c) => [c.key, c])), [def, mode]);
  const failing = [...checks.values()].filter((c) => !c.ok).length;
  return (
    <section className="ac-card ac-bt-editor" aria-label={`Editor of ${def.name}`}>
      <h2>{def.seq} · {def.name}</h2>
      {def.description && <p className="ac-muted">{def.description}</p>}
      {def.builtin && (
        <Callout kind="blue">
          Built-in themes are protected. <button type="button" className="ac-btn" onClick={() => { duplicateTheme(def.seq); selectTheme(lastIssuedSeq()); }}>Duplicate to edit</button>
        </Callout>
      )}
      {def.diagnostic && <RainbowLegend table={table} />}
      {!def.builtin && <GeneratorPanel key={def.seq} def={def} />}
      <p className={failing ? 'ac-bt-warn' : 'ac-muted'} role="status">
        {failing ? `⚠ ${failing} colour pair${failing === 1 ? '' : 's'} below the WCAG minimum in ${mode} mode.` : `Every checked colour pair reaches the WCAG minimum in ${mode} mode.`}
      </p>
      <fieldset className="ac-bt-fields" disabled={def.builtin}>
        <legend className="ac-sr">Colours of {def.name}</legend>
        {GROUPS.map(([g, keys], i) => (
          <details key={g} open={i < 2}>
            <summary>{g}</summary>
            {keys.map((k) => <ColourRow key={k} k={k} def={def} table={table} check={checks.get(k)} />)}
          </details>
        ))}
        <AxesEditor def={def} />
      </fieldset>
    </section>
  );
}
