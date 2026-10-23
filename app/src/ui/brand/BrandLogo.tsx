import { useMemo } from 'react';
import { activateTheme } from '@/controllers/themes';
import { findTheme } from '@/domain/theme/library';
import { logoAlt, shownLogo } from '@/domain/theme/logo';
import { useDoc } from '@/store/hooks';
import { clearThemeOverride, useThemeView } from './themeView';

/** The customer logo next to "AgentCase for <customer>" (docs/THEME.md §8.6); nothing when the case has none or hides it. */
export function BrandLogo() {
  const raw = useDoc((d) => d.CUSTOMER_LOGO), customer = useDoc((d) => (d.customerName as string | undefined) ?? '');
  const logo = useMemo(() => shownLogo({ CUSTOMER_LOGO: raw }), [raw]);
  if (!logo) return null;
  return <img className="ac-brand-logo" data-backdrop={logo.backdrop} src={logo.src} alt={logoAlt(customer)} />;
}
/** Whether the header shows a logo (the title row becomes a flex row only then: the default header keeps its layout). */
export const useHasLogo = (): boolean => { const raw = useDoc((d) => d.CUSTOMER_LOGO); return useMemo(() => !!shownLogo({ CUSTOMER_LOGO: raw }), [raw]); };

/** "Viewing theme N · name from the link": the `?theme=` override, with the two ways out (docs/THEME.md §8.7). */
export function ThemeLinkNotice() {
  const seq = useThemeView((s) => s.override), themes = useDoc((d) => d.THEMES);
  const t = seq !== null && Number.isInteger(seq) ? findTheme({ THEMES: themes }, seq) : undefined;
  if (!t) return null;
  return (
    <div className="ac-theme-notice" role="status">
      Viewing theme {t.seq} · {t.name} from the link.
      <button type="button" onClick={() => { activateTheme(t.seq); clearThemeOverride(); }}>Make it the case theme</button>
      <button type="button" onClick={clearThemeOverride}>Clear</button>
    </div>
  );
}
