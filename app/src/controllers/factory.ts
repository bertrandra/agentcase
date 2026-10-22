/** @calc-zone workspace-config */
import { NEW_RECORD, nextId, ON_REMOVE, type Coll } from '@/domain/factory/collections';
import type { ArtefactTag, IntegratedProduct, PhaseFeatures } from '@/domain/factory/types';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/** Factory meta-model editing: generic add / set / remove on the record collections, plus the few links that need their own rule. */
type Rec = { id: string; [k: string]: unknown };
export const list = <T = Rec>(d: Doc, k: string): T[] => ((d as Record<string, unknown>)[k] ??= []) as T[];
const today = (): string => new Date().toISOString().slice(0, 10);

const addCmd = defineCommand<{ coll: Coll; today: string }>({
  type: 'factory.add', label: (p) => `Add to ${p.coll.toLowerCase().replace(/_/g, ' ')}`,
  run(d, p) { const spec = NEW_RECORD[p.coll], arr = list(d, p.coll); arr.push({ id: nextId(spec.prefix, arr), ...spec.make(d as Record<string, unknown>, p.today) }); },
});
const setCmd = defineCommand<{ coll: Coll; id: string; field: string; value: unknown }>({
  type: 'factory.set', label: (p) => `Set ${p.field} of ${p.id}`, coalesceKey: (p) => `factory.set:${p.coll}:${p.id}:${p.field}`,
  run(d, p) { const r = list(d, p.coll).find((x) => x.id === p.id); if (r) r[p.field] = p.value; },
});
const removeCmd = defineCommand<{ coll: Coll; id: string }>({
  type: 'factory.remove', label: (p) => `Delete ${p.id}`,
  run(d, p) {
    if (p.coll === 'ENVIRONMENTS' && list(d, 'ENVIRONMENTS').length <= 1) return;   // never leave zero environments
    (d as Record<string, unknown>)[p.coll] = list(d, p.coll).filter((x) => x.id !== p.id);
    for (const r of ON_REMOVE[p.coll] ?? []) {
      if (r.mode === 'delete') (d as Record<string, unknown>)[r.coll] = list(d, r.coll).filter((x) => x[r.field] !== p.id);
      else list(d, r.coll).forEach((x) => { if (x[r.field] === p.id) x[r.field] = null; });
    }
    if (p.coll === 'FEATURES') list<PhaseFeatures>(d, 'fmPhaseFeatures').forEach((ph) => { if (ph.featureIds) ph.featureIds = ph.featureIds.filter((x) => x !== p.id); });
    if (p.coll === 'STORIES') [...list<ArtefactTag>(d, 'fmArtefactTags'), ...list<ArtefactTag>(d, 'fmRegArtefactTags')].forEach((t) => { if (t.storyId === p.id) t.storyId = null; });
    if (p.coll === 'BUILD_ARTIFACTS') { const ip = (d as Record<string, unknown>).INTEGRATED_PRODUCT as IntegratedProduct; ip.buildArtifactIds = (ip.buildArtifactIds || []).filter((x) => x !== p.id); }
  },
});
const phaseCmd = defineCommand<{ featureId: string; phaseId: string; on: boolean }>({
  type: 'factory.togglePhaseFeature', label: (p) => `${p.on ? 'Link' : 'Unlink'} ${p.featureId} ${p.on ? 'to' : 'from'} phase ${p.phaseId}`,
  run(d, p) {
    const ph = list<PhaseFeatures>(d, 'fmPhaseFeatures').find((x) => x.id === p.phaseId); if (!ph) return;
    const ids = (ph.featureIds ??= []);
    if (p.on) { if (!ids.includes(p.featureId)) ids.push(p.featureId); } else ph.featureIds = ids.filter((x) => x !== p.featureId);
  },
});
const taskCmd = defineCommand<{ storyId: string; artId: string; isReg: boolean; on: boolean }>({
  type: 'factory.toggleStoryArtefact', label: (p) => `${p.on ? 'Link' : 'Unlink'} ${p.artId} ${p.on ? 'to' : 'from'} story ${p.storyId}`,
  run(d, p) {
    const tags = list<ArtefactTag>(d, p.isReg ? 'fmRegArtefactTags' : 'fmArtefactTags');
    const t = tags.find((x) => x.id === p.artId) ?? (tags.push({ id: p.artId, storyId: null }), tags[tags.length - 1] as ArtefactTag);
    t.storyId = p.on ? p.storyId : null;
  },
});

export const addRecord = (coll: Coll): void => appStore().dispatch(addCmd({ coll, today: today() }));
export const setField = (coll: Coll, id: string, field: string, value: unknown): void => appStore().dispatch(setCmd({ coll, id, field, value }));
export const removeRecord = (coll: Coll, id: string): void => appStore().dispatch(removeCmd({ coll, id }));
export const togglePhaseFeature = (featureId: string, phaseId: string, on: boolean): void => appStore().dispatch(phaseCmd({ featureId, phaseId, on }));
export const toggleStoryArtefact = (storyId: string, artId: string, isReg: boolean, on: boolean): void => appStore().dispatch(taskCmd({ storyId, artId, isReg, on }));
