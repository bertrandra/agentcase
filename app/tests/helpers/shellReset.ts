import { uiStore } from '@/ui/uiState';
import { loadCase } from './pdc';

/** The shell tests' starting point: Home, no toast, dock and menu closed, the guided sequence off, the golden case loaded. */
export function resetShell(): void {
  uiStore.setState({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, wiz: { active: false, pos: 0, visited: [] } });
  loadCase('golden');
}
