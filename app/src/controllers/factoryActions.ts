/** @calc-zone workspace-config */
import demo from '@/domain/factory/demo.json';
import { EMPTY_FACTORY } from '@/domain/factory/empty';
import { generateFactory } from '@/domain/factory/generate';
import { FG_DEFAULT, fgParams } from '@/domain/factory/params';
import { nextId } from '@/domain/factory/collections';
import type { ArtefactTag, BacklogItem, FactoryData, Feedback, IntegratedProduct, PhaseFeatures, QualityGate, ReleaseItem, ReleaseItemType, Vision } from '@/domain/factory/types';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';
import { ctxOfDraft } from './modelKit';
import { list } from './factory';

/** Vision, release items, approvals, feedback, integrated product, demo data, "clear all", the weekly generator and its parameters. */
const rec = (d: Doc) => d as Record<string, unknown>;
const KEYS_CLEARED = ['PORTFOLIO_ITEMS', 'EPICS', 'FEATURES', 'STORIES', 'RELEASES', 'RELEASE_ITEMS', 'RELEASE_CANDIDATES', 'APPROVALS', 'DEPLOYMENTS', 'ENVIRONMENTS',
  'COMMITS', 'BUILDS', 'BUILD_ARTIFACTS', 'QUALITY_GATES', 'INTEGRATED_PRODUCT', 'MONITORING_EVENTS', 'FEEDBACK_ITEMS', 'BACKLOG_ITEMS'] as const;
const ip = (d: Doc) => rec(d).INTEGRATED_PRODUCT as IntegratedProduct;

/** Replace the factory domain: arrays, vision, phase → feature links and artefact → story links (everything not named is unlinked). */
function replaceFactory(d: Doc, data: Partial<FactoryData>, phaseFeatures: Record<string, string[]>, storyOf: Record<string, string>, nowIso: string, keep: readonly string[] = []): void {
  const v = rec(d).VISION as Vision | undefined;
  rec(d).VISION = { id: v?.id ?? 'vision-1', statement: data.VISION?.statement ?? '', updatedAt: nowIso };
  for (const k of KEYS_CLEARED.filter((x) => !keep.includes(x))) rec(d)[k] = structuredClone((data as Record<string, unknown>)[k] ?? (EMPTY_FACTORY as unknown as Record<string, unknown>)[k]);
  list<PhaseFeatures>(d, 'fmPhaseFeatures').forEach((p) => { p.featureIds = [...(phaseFeatures[p.id] ?? [])]; });
  [...list<ArtefactTag>(d, 'fmArtefactTags'), ...list<ArtefactTag>(d, 'fmRegArtefactTags')].forEach((t) => { t.storyId = storyOf[t.id] ?? null; });
}

const visionCmd = defineCommand<{ text: string; now: string }>({
  type: 'factory.setVision', label: () => 'Edit the vision', coalesceKey: () => 'factory.setVision',
  run(d, p) { rec(d).VISION = { ...(rec(d).VISION as Vision), statement: p.text, updatedAt: p.now }; },
});
const itemAddCmd = defineCommand<{ releaseId: string; itemType: ReleaseItemType; itemId: string | null; label: string | null }>({
  type: 'factory.addReleaseItem', label: (p) => `Add a ${p.itemType} to release ${p.releaseId}`,
  run(d, p) { const a = list<ReleaseItem>(d, 'RELEASE_ITEMS'); a.push({ id: nextId('ri', a), releaseId: p.releaseId, itemType: p.itemType, itemId: p.itemId || null, label: p.label || null }); },
});
const itemDelCmd = defineCommand<{ id: string }>({
  type: 'factory.removeReleaseItem', label: (p) => `Remove release item ${p.id}`,
  run(d, p) { rec(d).RELEASE_ITEMS = list<ReleaseItem>(d, 'RELEASE_ITEMS').filter((x) => x.id !== p.id); },
});
const decisionCmd = defineCommand<{ id: string; decision: string; today: string }>({
  type: 'factory.setApprovalDecision', label: (p) => `Mark approval ${p.id} ${p.decision}`,
  run(d, p) { const a = list<{ id: string; decision: string; decidedAt: string | null }>(d, 'APPROVALS').find((x) => x.id === p.id); if (a) { a.decision = p.decision; a.decidedAt = p.decision === 'Pending' ? null : p.today; } },
});
const backlogCmd = defineCommand<{ id: string }>({
  type: 'factory.feedbackToBacklog', label: (p) => `Create a backlog item from feedback ${p.id}`,
  run(d, p) {
    const f = list<Feedback>(d, 'FEEDBACK_ITEMS').find((x) => x.id === p.id); if (!f || f.backlogItemId) return;
    const bl = list<BacklogItem>(d, 'BACKLOG_ITEMS'), bid = nextId('backlog', bl);
    bl.push({ id: bid, description: f.description || `From feedback ${f.id}`, status: 'New', sourceFeedbackId: f.id });
    f.backlogItemId = bid;
  },
});
const ipNameCmd = defineCommand<{ name: string }>({ type: 'factory.ipSetName', label: () => 'Rename the integrated product', coalesceKey: () => 'factory.ipSetName', run(d, p) { ip(d).name = p.name; } });
const ipToggleCmd = defineCommand<{ artId: string; on: boolean }>({
  type: 'factory.ipToggleArtifact', label: (p) => `${p.on ? 'Include' : 'Exclude'} ${p.artId} in the integrated product`,
  run(d, p) { const ids = (ip(d).buildArtifactIds ??= []); ip(d).buildArtifactIds = p.on ? (ids.includes(p.artId) ? ids : [...ids, p.artId]) : ids.filter((x) => x !== p.artId); },
});
const ipAutoCmd = defineCommand<Record<string, never>>({
  type: 'factory.ipAutoInclude', label: () => 'Include every build artefact that passes its gate',
  run(d) { ip(d).buildArtifactIds = [...new Set(list<QualityGate>(d, 'QUALITY_GATES').filter((g) => g.result === 'Pass').map((g) => g.buildArtifactId).filter((x): x is string => !!x))]; },
});
const demoCmd = defineCommand<{ now: string }>({
  type: 'factory.loadDemo', label: () => 'Load the demo dataset',
  run(d, p) {
    // the demo uses the seeded stages: it never resets the environments
    replaceFactory(d, demo as unknown as Partial<FactoryData>, Object.fromEntries(demo.phaseFeatures.map((x) => [x.id, x.featureIds])), demo.storyOf as Record<string, string>, p.now, ['ENVIRONMENTS']);
  },
});
const clearCmd = defineCommand<{ now: string }>({ type: 'factory.clearAll', label: () => 'Delete all Factory Model data', run(d, p) { replaceFactory(d, {}, {}, {}, p.now); } });
const generateCmd = defineCommand<{ now: string }>({
  type: 'factory.generate', label: () => 'Generate weekly factory data',
  run(d, p) {
    const t0 = Date.now(), g = generateFactory(ctxOfDraft(d), fgParams(rec(d).FG_PARAMS as never), p.now);
    if (!g) return;
    replaceFactory(d, g.data, g.phaseFeatures, g.storyOf, p.now);
    for (const k of ['SPRINTS', 'PROGRAM_INCREMENTS', 'STORY_ASSIGNMENTS'] as const) rec(d)[k] = g.data[k];
    rec(d).FG_PROVENANCE = { ...g.provenance, ms: Date.now() - t0 };
  },
});
const paramCmd = defineCommand<{ key: string; value: string | number }>({
  type: 'factory.setParam', label: (p) => `Set generator ${p.key} to ${p.value}`, coalesceKey: (p) => `factory.setParam:${p.key}`,
  run(d, p) { const x = parseFloat(String(p.value)); if (isNaN(x) || !(p.key in FG_DEFAULT)) return; rec(d).FG_PARAMS = { ...fgParams(rec(d).FG_PARAMS as never), [p.key]: x }; },
});
const resetParamsCmd = defineCommand<Record<string, never>>({ type: 'factory.resetParams', label: () => 'Reset the generator parameters', run(d) { rec(d).FG_PARAMS = { ...FG_DEFAULT }; } });

const now = (): string => new Date().toISOString();
export const setVision = (text: string): void => appStore().dispatch(visionCmd({ text, now: now() }));
export const addReleaseItem = (releaseId: string, itemType: ReleaseItemType, itemId: string | null, label: string | null): void => appStore().dispatch(itemAddCmd({ releaseId, itemType, itemId, label }));
export const removeReleaseItem = (id: string): void => appStore().dispatch(itemDelCmd({ id }));
export const setApprovalDecision = (id: string, decision: string): void => appStore().dispatch(decisionCmd({ id, decision, today: now().slice(0, 10) }));
export const feedbackToBacklog = (id: string): void => appStore().dispatch(backlogCmd({ id }));
export const setIpName = (name: string): void => appStore().dispatch(ipNameCmd({ name }));
export const toggleIpArtifact = (artId: string, on: boolean): void => appStore().dispatch(ipToggleCmd({ artId, on }));
export const autoIncludePassing = (): void => appStore().dispatch(ipAutoCmd({}));
export const loadDemoDataset = (): void => appStore().dispatch(demoCmd({ now: now() }));
export const clearFactoryData = (): void => appStore().dispatch(clearCmd({ now: now() }));
export const generateFactoryData = (): void => appStore().dispatch(generateCmd({ now: now() }));
export const setGeneratorParam = (key: string, value: string | number): void => appStore().dispatch(paramCmd({ key, value }));
export const resetGeneratorParams = (): void => appStore().dispatch(resetParamsCmd({}));
