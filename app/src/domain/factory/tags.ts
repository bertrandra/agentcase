import type { Ctx } from '../ctx';
import type { ArtefactTag } from './types';

/** Factory tags of the artefacts (story link, capability, who does the work), SDLC and regulatory together, by artefact id. */
export function tagMap(c: Ctx): Map<string, ArtefactTag> {
  const s = c.s as unknown as { fmArtefactTags?: ArtefactTag[]; fmRegArtefactTags?: ArtefactTag[] };
  return new Map([...(s.fmArtefactTags ?? []), ...(s.fmRegArtefactTags ?? [])].map((t) => [t.id, t]));
}
