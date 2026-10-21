import { EVIDENCE_TIERS, EVL_STAGES } from '@/domain/model/evidence';
import { ensureNs, type EvidenceEntry, type EvidenceTier } from '@/domain/model/modelState';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/** P6 evidence ledger: tier, source, as-of date and owner per driver, and the case stage. */
const entry = (d: Doc, id: string): EvidenceEntry => (ensureNs(d.MODEL, 'EVIDENCE').drivers[id] ??= { tier: 'ASSUMPTION', source: '', asOf: '', owner: '' });
const toggleCmd = defineCommand<{ on: boolean }>({
  type: 'model.evl.enable', label: (p) => `${p.on ? 'Enable' : 'Disable'} P6 evidence ledger`, run(d, p) { d.MODEL.FLAGS.evl = p.on; },
});
const stageCmd = defineCommand<{ stage: string }>({
  type: 'model.evl.setStage', label: (p) => `Set the case stage to ${p.stage}`,
  run(d, p) { if ((EVL_STAGES as readonly string[]).includes(p.stage)) ensureNs(d.MODEL, 'EVIDENCE').stage = p.stage; },
});
const tierCmd = defineCommand<{ id: string; tier: string }>({
  type: 'model.evl.setTier', label: (p) => `Set the evidence tier of ${p.id} to ${p.tier}`,
  run(d, p) { if (EVIDENCE_TIERS[p.tier as EvidenceTier] == null) return; entry(d, p.id).tier = p.tier as EvidenceTier; d.MODEL.FLAGS.evl = true; },
});
const textCmd = (type: string, name: string, key: 'source' | 'asOf' | 'owner') => defineCommand<{ id: string; value: string }>({
  type, label: (p) => `Set the ${name} of ${p.id}`, coalesceKey: (p) => `${type}:${p.id}`, run(d, p) { entry(d, p.id)[key] = String(p.value ?? ''); },
});
const sourceCmd = textCmd('model.evl.setSource', 'evidence source', 'source');
const asOfCmd = textCmd('model.evl.setAsOf', 'as-of date', 'asOf');
const ownerCmd = textCmd('model.evl.setOwner', 'evidence owner', 'owner');

export const enableEvl = (on: boolean): void => appStore().dispatch(toggleCmd({ on }));
export const setEvlStage = (stage: string): void => appStore().dispatch(stageCmd({ stage }));
export const setEvlTier = (id: string, tier: string): void => appStore().dispatch(tierCmd({ id, tier }));
export const setEvlSource = (id: string, value: string): void => appStore().dispatch(sourceCmd({ id, value }));
export const setEvlAsOf = (id: string, value: string): void => appStore().dispatch(asOfCmd({ id, value }));
export const setEvlOwner = (id: string, value: string): void => appStore().dispatch(ownerCmd({ id, value }));
