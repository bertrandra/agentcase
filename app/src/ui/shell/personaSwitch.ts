import { setPersona } from '@/controllers/persona';
import { goSection } from '../uiState';

/** Select a persona and land on the first section of its menu (Welcome for Advanced), as the legacy setPersona does. */
export function switchPersona(id: string, landing: string): void {
  setPersona(id);
  goSection(landing);
}
