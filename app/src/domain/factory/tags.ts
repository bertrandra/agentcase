/** @calc-zone workspace-config */
import type { Ctx } from '../ctx';
import { caseViews } from '../process/engineInputs';
import type { CatArtefact } from '../process/types';
import type { ArtefactTag } from './types';

/**
 * Factory tags of the artefacts (story link, capability, who does the work), SDLC and regulatory together, by artefact id. With a process
 * document (B5) the capability and the activity type are the activity's own (`ac:activity capability` / its task type: one source, and a custom
 * activity is tagged too); the story link is the factory's (`fmArtefactTags`, the workspace data it edits), else the activity's `storyId`.
 * A version 2 object without a document reads its stored tags as they are.
 */
export function tagMap(c: Ctx): Map<string, ArtefactTag> {
  const s = c.s as unknown as { fmArtefactTags?: ArtefactTag[]; fmRegArtefactTags?: ArtefactTag[] };
  const own = new Map([...(s.fmArtefactTags ?? []), ...(s.fmRegArtefactTags ?? [])].map((t) => [t.id, t]));
  if (!caseViews(c.s)) return own;
  return new Map([...c.a.sdlc, ...c.a.reg].map((a): [string, ArtefactTag] => {
    const t = own.get(a.id), x = a as CatArtefact;
    return [a.id, { id: a.id, storyId: t ? t.storyId : x.storyId ?? null, capability: x.capability, agentActivityType: x.agentActivityType }];
  }));
}
