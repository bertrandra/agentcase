/** @calc-zone exports */
import { current } from 'immer';
import { makeCtx } from '@/domain';
import { computeGlassCeiling } from '@/domain/model/ceiling';
import { refitPotential } from '@/store/derive';
import type { Doc } from '@/store/types';

/**
 * Apply an import patch to a document draft (legacy importParams epilogue): replace the touched keys, then re-fit the automation potential to the
 * FINAL scope (Phase Scope → SDLC Artifacts selection → re-fit, v18.10) and let the glass-ceiling slider show the ceiling in force.
 */
export function applyParamsPatch(draft: Doc, patch: Partial<Doc>): void {
  for (const k of Object.keys(patch)) (draft as Record<string, unknown>)[k] = structuredClone((patch as Record<string, unknown>)[k]);
  refitPotential(draft);
  if (!draft.forceGlassCeiling) draft.dom.values.glassCeiling = String(Math.round(computeGlassCeiling(makeCtx(current(draft) as Doc))));
}
