import { addBuiltinPersona, deleteStructure, duplicateStructure, renameStructure, setPersonaMenuStructure } from '@/controllers/menuStructures';
import { BUILTIN_STRUCTURES } from '@/domain/nav/structures';
import { deletePersona } from '@/controllers/pdcPersonas';
import type { Sample } from './types';

const copy = () => duplicateStructure('Lean', { ...BUILTIN_STRUCTURES[0]!, id: 'x', label: 'Business journey' });

export const samples: Record<string, Sample> = {
  'menu.duplicateStructure': copy,
  'menu.renameStructure': () => renameStructure('business-journey', 'Journey'),
  'menu.deleteStructure': { prep: copy, run: () => deleteStructure('lean') },
  'persona.setMenuStructure': () => setPersonaMenuStructure('builder', 'business-journey'),
  'persona.addBuiltin': { prep: () => deletePersona('business-journey'), run: () => addBuiltinPersona('business-journey', ['home', 'financial']) },
};
