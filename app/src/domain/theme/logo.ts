/** @calc-zone presentation */
/**
 * The customer logo of a client presentation (docs/THEME.md §8.6): shown next to "AgentCase for <customer>" in the header, the HTML report, the
 * HTML snapshot and the results workbook. Stored in the case as a PNG or JPEG data URL only (an SVG is rasterised to PNG before it is stored,
 * so no markup or script ever reaches the case); anything else read from a file is ignored.
 */
export type LogoBackdrop = 'none' | 'pill';
export interface CustomerLogo { src: string; backdrop: LogoBackdrop; hidden: boolean }

export const LOGO_MAX_BYTES = 200 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'] as const;
/** A data URL of LOGO_MAX_BYTES of image (base64 = 4/3) plus its header. */
const SRC_MAX = Math.ceil((LOGO_MAX_BYTES * 4) / 3) + 64;

/** Why a picked file cannot be a logo (null when it can). */
export function logoFileProblem(type: string, bytes: number): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(type)) return 'The logo must be a PNG, JPEG or SVG image.';
  if (bytes > LOGO_MAX_BYTES) return `The logo is too large (${Math.round(bytes / 1024)} KB, limit ${LOGO_MAX_BYTES / 1024} KB).`;
  return null;
}
/** A PNG or JPEG base64 data URL within the size limit. */
export const isLogoSrc = (s: unknown): s is string => typeof s === 'string' && s.length <= SRC_MAX && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(s);

/** The logo of a case, validated (null when there is none or it is not a valid image). */
export function logoOf(d: { CUSTOMER_LOGO?: unknown; [key: string]: unknown }): CustomerLogo | null {
  const l = d.CUSTOMER_LOGO as Partial<CustomerLogo> | undefined;
  if (!l || typeof l !== 'object' || !isLogoSrc(l.src)) return null;
  return { src: l.src, backdrop: l.backdrop === 'pill' ? 'pill' : 'none', hidden: l.hidden === true };
}
/** The logo to show (null when there is none or it is hidden for the presentation). */
export const shownLogo = (d: { CUSTOMER_LOGO?: unknown; [key: string]: unknown }): CustomerLogo | null => { const l = logoOf(d); return l && !l.hidden ? l : null; };
/** The alternative text: "<customer> logo". */
export const logoAlt = (customer: string): string => `${customer.trim() || 'Customer'} logo`;
