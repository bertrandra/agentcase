import { clearCustomerLogo, setCustomerLogo, setLogoOptions } from '@/controllers/brand';
import { activateTheme, addTheme, deleteTheme, duplicateTheme, importThemes, renameTheme, updateTheme } from '@/controllers/themes';
import type { Sample } from './types';

/** A 1x1 PNG. */
export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const own = () => addTheme('Mine');

export const samples: Record<string, Sample> = {
  'theme.add': own,
  'theme.duplicate': () => duplicateTheme(2),
  'theme.import': () => importThemes([{ name: 'Imported', colours: { primary: '#336699' }, axes: { radius: 'round' } }]),
  'theme.rename': { prep: own, run: () => renameTheme(100, 'Renamed') },
  'theme.update': { prep: own, run: () => updateTheme(100, { colours: { primary: '#aa3300' }, axes: { density: 'compact' } }) },
  'theme.delete': { prep: own, run: () => deleteTheme(100) },
  'theme.activate': () => activateTheme(7),
  'case.setLogo': () => setCustomerLogo(PNG),
  'case.clearLogo': { prep: () => setCustomerLogo(PNG), run: () => clearCustomerLogo() },
  'case.setLogoOptions': { prep: () => setCustomerLogo(PNG), run: () => setLogoOptions({ backdrop: 'pill', hidden: true }) },
};
