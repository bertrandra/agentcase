import { DARK_L } from '@/domain/theme/dark';
import { remapLightness } from '@/domain/theme/color';
import { displaySpec } from './store';

/**
 * A background colour that is content data (a card tint in the content JSON), as shown in the current display: unchanged in light,
 * re-ranked like the dark scale steps in dark (a pale tint becomes a dark tint of the same hue), so the theme's text roles still read on it.
 */
export function dataSurface(hex: string): string {
  return displaySpec().mode === 'dark' ? remapLightness(hex, DARK_L) : hex;
}
