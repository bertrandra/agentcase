import { COMMAND_REGISTRY, defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { AuditRecord } from '@/store/types';

type Edges = Record<string, Record<string, 'S' | 'I'>>;
const edgesOf = (d: { SECTION_DEPS?: unknown }): Edges => (d.SECTION_DEPS ??= {}) as Edges;
const descOf = (d: { SECTION_DEPS_DESC?: unknown }): Record<string, string> => (d.SECTION_DEPS_DESC ??= {}) as Record<string, string>;
const lbl = (p: { src: string; tgt: string }) => `${p.src} → ${p.tgt}`;

const addEdgeCmd = defineCommand<{ src: string; tgt: string }>({
  type: 'deps.addEdge', label: (p) => `Add dependency ${lbl(p)}`,
  run(d, p) { if (!p.src || !p.tgt || p.src === p.tgt) return; const e = edgesOf(d); (e[p.src] ??= {})[p.tgt] ??= 'S'; },
});
const flipEdgeCmd = defineCommand<{ src: string; tgt: string }>({
  type: 'deps.flipEdge', label: (p) => `Flip dependency ${lbl(p)} strong ↔ soft`,
  run(d, p) { const row = edgesOf(d)[p.src]; if (row?.[p.tgt]) row[p.tgt] = row[p.tgt] === 'S' ? 'I' : 'S'; },
});
const removeEdgeCmd = defineCommand<{ src: string; tgt: string }>({
  type: 'deps.removeEdge', label: (p) => `Remove dependency ${lbl(p)}`,
  run(d, p) { const e = edgesOf(d); if (!e[p.src]) return; delete e[p.src][p.tgt]; if (!Object.keys(e[p.src]).length) delete e[p.src]; },
});
const setDescCmd = defineCommand<{ src: string; text: string }>({
  type: 'deps.setDescription', label: (p) => `Describe the impact of ${p.src}`, coalesceKey: (p) => `deps.setDescription:${p.src}`,
  run(d, p) { descOf(d)[p.src] = String(p.text ?? ''); },
});
const applyPruneCmd = defineCommand<{ deps: Edges; desc: Record<string, string> }>({
  type: 'deps.prune', label: () => 'Prune dependencies of deleted sections',
  run(d, p) { d.SECTION_DEPS = p.deps; d.SECTION_DEPS_DESC = p.desc; },
});

/** Add a strong edge source → target (no-op for an existing edge or a self-loop). */
export const addDepEdge = (src: string, tgt: string): void => appStore().dispatch(addEdgeCmd({ src, tgt }));
/** Flip an edge between strong (calculation input) and soft (annotation). */
export const flipDepEdge = (src: string, tgt: string): void => appStore().dispatch(flipEdgeCmd({ src, tgt }));
export const removeDepEdge = (src: string, tgt: string): void => appStore().dispatch(removeEdgeCmd({ src, tgt }));
export const setDepDescription = (src: string, text: string): void => appStore().dispatch(setDescCmd({ src, text }));
/** Replace the registry by an already-pruned copy (see `pruneDeps` in the domain). */
export const applyPrunedDeps = (deps: Edges, desc: Record<string, string>): void => appStore().dispatch(applyPruneCmd({ deps, desc }));

/** The audit log of the store (every command, undo, redo, load and remote patch), oldest first. */
export const auditLog = (): AuditRecord[] => appStore().getState().audit;
/** Every command type registered by the loaded controllers. */
export const commandTypes = (): { type: string; undoable: boolean }[] => [...COMMAND_REGISTRY.values()].sort((a, b) => a.type.localeCompare(b.type));
