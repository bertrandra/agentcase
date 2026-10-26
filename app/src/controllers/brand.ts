/** @calc-zone workspace-config */
/**
 * The customer logo of a client presentation (docs/THEME.md §8.6): undoable set / clear / options on `CUSTOMER_LOGO`. Only a PNG or JPEG data URL
 * is stored (`isLogoSrc`); an SVG is rasterised by the screen first (`ui/sections/configure/brand-theme/logoFile.ts`).
 */
import { isLogoSrc, logoOf, type LogoBackdrop } from '@/domain/theme/logo';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';

const setCmd = defineCommand<{ src: string }>({
  type: 'case.setLogo', label: () => 'Set the customer logo',
  run(d, p) { if (!isLogoSrc(p.src)) return; const l = logoOf(d); d.CUSTOMER_LOGO = { src: p.src, backdrop: l?.backdrop ?? 'none', hidden: false }; },
});
const clearCmd = defineCommand<Record<string, never>>({
  type: 'case.clearLogo', label: () => 'Remove the customer logo', run(d) { delete d.CUSTOMER_LOGO; },
});
const optionsCmd = defineCommand<{ backdrop?: LogoBackdrop; hidden?: boolean }>({
  type: 'case.setLogoOptions',
  label: (p) => (p.hidden !== undefined ? `${p.hidden ? 'Hide' : 'Show'} the customer logo`
    : `Logo backdrop: ${p.backdrop === 'pill' ? 'white pill' : 'none'}`),
  run(d, p) {
    const l = logoOf(d);
    if (!l) return;
    d.CUSTOMER_LOGO = { ...l, ...(p.backdrop ? { backdrop: p.backdrop === 'pill' ? 'pill' : 'none' } : {}),
      ...(p.hidden !== undefined ? { hidden: !!p.hidden } : {}) };
  },
});

export const setCustomerLogo = (src: string): void => appStore().dispatch(setCmd({ src }));
export const clearCustomerLogo = (): void => appStore().dispatch(clearCmd({}));
export const setLogoOptions = (o: { backdrop?: LogoBackdrop; hidden?: boolean }): void => appStore().dispatch(optionsCmd(o));
