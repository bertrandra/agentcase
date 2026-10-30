/** @calc-zone exports */
import { current } from 'immer';
import { makeCtx } from '@/domain';
import { computeGlassCeiling } from '@/domain/model/ceiling';
import { refitPotential } from '@/store/derive';
import { editScope } from '@/store/processEdit';
import type { Doc } from '@/store/types';
import { assignScope, splitScope } from '../../bpmn/legacy';

/**
 * Apply an import patch to a document draft (legacy importParams epilogue): replace the touched keys, then re-fit the automation potential to the
 * FINAL scope (Phase Scope → SDLC Artifacts selection → re-fit, v18.10) and let the glass-ceiling slider show the ceiling in force.
 */
export function applyParamsPatch(draft: Doc, patch: Partial<Doc>): void {
  const { scope, rest } = splitScope(patch as Record<string, unknown>);   // schema v3: legacy scope sheets edit the process document
  for (const k of Object.keys(rest)) (draft as Record<string, unknown>)[k] = structuredClone(rest[k]);
  if (Object.keys(scope).length) editScope(draft, (k) => assignScope(k, scope));
  refitPotential(draft);
  if (!draft.forceGlassCeiling) draft.dom.values.glassCeiling = String(Math.round(computeGlassCeiling(makeCtx(current(draft) as Doc))));
}
