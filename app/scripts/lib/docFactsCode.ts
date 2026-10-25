/**
 * Code-derived counts for the documentation facts: loads every controller (which registers the commands) and the section loader map. Vite only (vite-node,
 * Vitest).
 */
import { COMMAND_REGISTRY } from '../../src/store/commands';
import { SECTION_COMPONENTS } from '../../src/ui/sections';
import type { CodeCounts } from './docFacts';

import.meta.glob('/src/controllers/*.ts', { eager: true });   // registers every command, as tests/store/registry.test.ts does

export function codeCounts(): CodeCounts {
  const all = [...COMMAND_REGISTRY.values()];
  return {
    commands: all.length, undoable: all.filter((c) => c.undoable).length,
    portfolioCommands: all.filter((c) => /^(product|wave|portfolio)\./.test(c.type)).length,
    loaders: Object.keys(SECTION_COMPONENTS).length,
  };
}
