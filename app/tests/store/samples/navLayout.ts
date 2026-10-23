import { clearPersonaSectionOrder, placeSections, setGroupOrders, setPersonaSectionOrder, setPersonaSections, setSectionMvp, setSectionNavStyle, setSectionTag } from '@/controllers/navLayout';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'nav.placeSections': () => placeSections('Move Financial to 1 · Frame', [{ id: 'financial', group: 'frame', groupSeq: 5 }]),
  'nav.setGroupOrders': () => setGroupOrders('Move the group frame down', { frame: 99 }),
  'nav.setPersonaOrder': () => setPersonaSectionOrder('Reorder the menu of admin', 'admin', { home: 5 }),
  'nav.clearPersonaOrder': { prep: () => setPersonaSectionOrder('Reorder the menu of admin', 'admin', { home: 5, board: 6 }), run: () => clearPersonaSectionOrder('admin', 'home') },
  'nav.setPersonaSections': () => setPersonaSections('admin', ['home']),
  'nav.setSectionNavStyle': () => setSectionNavStyle('tabs'),
  'nav.setSectionTag': () => setSectionTag('financial', 'reads'),
  'nav.setSectionMvp': () => setSectionMvp('board', true),
};
