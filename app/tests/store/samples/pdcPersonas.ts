import {
  addGroup, addPersona, addPersonaSection, deleteGroup, deletePersona, duplicatePersona, removePersonaSection, renameGroup, renamePersona, setDefaultPersona, setGroupColor, setGroupDescription,
  setGroupOrder, setPersonaCompactNav, setPersonaOrder,
} from '@/controllers/pdcPersonas';
import type { Sample } from './types';

export const samples: Record<string, Sample> = {
  'persona.add': () => addPersona('Executive'),
  'persona.duplicate': () => duplicatePersona('builder', []),
  'persona.delete': () => deletePersona('admin'),
  'persona.rename': () => renamePersona('admin', 'Administrator'),
  'persona.setOrder': () => setPersonaOrder('admin', 9),
  'persona.setCompactNav': () => setPersonaCompactNav('admin', true),
  'persona.setDefault': () => setDefaultPersona('admin'),
  'persona.addSection': () => addPersonaSection('admin', 'financial'),
  'persona.removeSection': () => removePersonaSection('admin', 'board'),
  'persona.addGroup': () => addGroup('Compliance'),
  'persona.renameGroup': () => renameGroup('frame', '1 · Framing'),
  'persona.deleteGroup': () => deleteGroup('factory'),
  'persona.setGroupOrder': () => setGroupOrder('frame', 11),
  'persona.setGroupDescription': () => setGroupDescription('frame', 'First'),
  'persona.setGroupColor': () => setGroupColor('frame', '#112233'),
};
