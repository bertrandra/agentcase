import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ThemeDef } from '@/domain/theme/themeDef';
import { useDoc } from '@/store/hooks';
import { applyPreviewTheme } from '@/ui/brand/applyTheme';
import { BrandLogo } from '@/ui/brand/BrandLogo';
import { ThemeAxesContext } from '@/ui/themeAxes';
import { Callout, Stat, StatRow } from '@/ui/widgets/cards';
import { PreviewChart, PreviewControls } from './PreviewControls';
import { setPreviewDark, useBrandThemeView, useDraft, withDraft } from './selection';

/**
 * A mini page in the selected theme: header with logo and title, KPI bar, navigation, a section card with a callout, key figures, a table, a chart
 * and one control of each kind. The theme is applied to the container only (every token inline, docs/THEME.md §8.2): the app keeps its own.
 * While the palette generator is tried (§8.9), the preview shows the generated palette before it is applied.
 */
export function Preview({ def: theme }: { def: ThemeDef }) {
  const draft = useDraft(theme.seq), def = useMemo(() => withDraft(theme, draft), [theme, draft]);
  const ref = useRef<HTMLDivElement>(null), dark = useBrandThemeView((s) => s.previewDark),
    customer = useDoc((d) => (d.customerName as string | undefined) ?? '');
  useLayoutEffect(() => { if (ref.current) applyPreviewTheme(def, { mode: dark ? 'dark' : 'light', contrast: 'standard', cvd: false, reduceMotion: false },
    ref.current); }, [def, dark]);
  return (
    <section className="ac-card ac-bt-preview-card" aria-label="Live preview">
      <h2>Live preview{draft ? ' (generated palette, not applied)' : ''}</h2>
      <div className="ac-bt-actions" role="group" aria-label="Preview mode">
        <button type="button" className="ac-btn" aria-pressed={!dark} onClick={() => setPreviewDark(false)}>Light</button>
        <button type="button" className="ac-btn" aria-pressed={dark} onClick={() => setPreviewDark(true)}>Dark</button>
      </div>
      <div ref={ref} className="ac-bt-preview" data-testid="theme-preview">
        <ThemeAxesContext.Provider value={def.axes}>
          <div className="ac-bt-pv-head"><strong>AgentCase{customer ? ` for ${customer}` : ''}</strong><BrandLogo /></div>
          <div className="ac-bt-pv-kpis"><span><b>€1.2M</b> NPV</span><span><b>14 mo</b> Payback</span><span><b>38%</b> Automation</span></div>
          <div className="ac-bt-pv-body">
            <div className="ac-bt-pv-nav">
              <div className="ac-bt-pv-group">2 · Baseline</div>
              <span className="ac-bt-pv-item">Team</span><span className="ac-bt-pv-item is-active">Rate card</span><span
                className="ac-bt-pv-item">Locations</span>
            </div>
            <div className="ac-bt-pv-section">
              <h3>Section title</h3>
              <Callout>A callout explains what the section does. <a href="#main">A link</a>.</Callout>
              <StatRow><Stat label="Run cost" value="€840K" /><Stat label="Saving" value="€410K" /></StatRow>
              <table className="ac-table">
                <thead><tr><th>Phase</th><th>FTE</th><th>Automation</th></tr></thead>
                <tbody>
                  <tr><td>Design</td><td>4.0</td><td>35%</td></tr>
                  <tr><td>Build</td><td>9.5</td><td>52%</td></tr>
                  <tr><td>Test</td><td>6.0</td><td>44%</td></tr>
                </tbody>
              </table>
              <PreviewChart />
              <PreviewControls />
            </div>
          </div>
        </ThemeAxesContext.Provider>
      </div>
    </section>
  );
}
