/** @calc-zone exports */
import { REG_ARTEFACTS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { blue, frz, head, sheet } from '../kit';
import { cleanText, longText, num, str } from '../safe';
import type { FmRow, ParamsDoc, ReadCtx, Rows, SheetFamily, WriteCtx } from '../types';
import { FM_SPECS } from './fmSpecs';

type Obj = Record<string, string | number | boolean | null>;
const list = (w: ParamsDoc, key: string): FmRow[] => (Array.isArray(w[key]) ? (w[key] as FmRow[]) : []);

function write({ wb, d }: WriteCtx): void {
  const single = sheet(wb, 'FM Singletons', [['Field', 36], ['Value', 40]]);
  [['Vision statement', d.VISION?.statement || ''], ['Integrated Product name', d.INTEGRATED_PRODUCT?.name || ''],
    ['Integrated Product — included Build Artifact IDs', (d.INTEGRATED_PRODUCT?.buildArtifactIds || []).join(';')]]
    .forEach((r) => blue(single.addRow(r).getCell(2)));
  head(single); frz(single);
  FM_SPECS.forEach((spec) => {
    const ws = sheet(wb, spec.sheet, spec.cols.map(([h, w]): [string, number] => [h, w]));
    list(d, spec.key).forEach((item) => {
      const row = ws.addRow(spec.cols.map(([, , f]) => {
        const v = f === 'phaseIds' ? d.fmPhaseFeatures.filter((p) => (p.featureIds || []).includes(String(item.id))).map((p) => p.id) : item[f];
        return v == null ? '' : Array.isArray(v) ? v.join(';') : (v as string | number);
      }));
      spec.cols.forEach((_c, i) => blue(row.getCell(i + 1)));
    });
    head(ws); frz(ws);
  });
}

const clean = (v: unknown): string | number | boolean | null => {
  if (v == null || v === '') return null;
  return typeof v === 'string' ? cleanText(v, 300) : (v as number | boolean);
};
function table(r: Rows | null, fields: string[]): Obj[] | null {
  if (!r) return null;
  return r.slice(1).filter((x) => x[0] != null && str(x[0]) !== '').map((x) => Object.fromEntries(fields.map((f, i) => [f, clean(x[i])])) as Obj);
}
const fk = (valid: Set<unknown>, v: unknown): unknown => (v != null && valid.has(v) ? v : null);
const memo = new Map<string, Set<unknown>>();   // per sheet: the arrays an id set is built from only change between sheets
const idSet = (w: ParamsDoc, key: string): Set<unknown> => {
  let s = memo.get(key);
  if (!s) { s = new Set(list(w, key).map((x) => x.id)); memo.set(key, s); } return s;
};
const or = <T,>(v: unknown, d: T): unknown => (v == null || v === '' ? d : v);
const validTask = (id: unknown): boolean => {
  const s = String(id ?? ''), i = s.indexOf(':'); if (i < 0) return false;
  const kind = s.slice(0, i), tid = s.slice(i + 1);
  return (kind === 'sdlc' ? SDLC_ARTEFACTS : REG_ARTEFACTS).some((a) => a.id === tid);
};

type Build = (o: Obj, w: ParamsDoc, i: number) => FmRow;
/** Row → entity, in dependency order (a foreign key that does not resolve is nulled, like every other import here). */
const BUILD: [string, Build][] = [
  ['FM Portfolio', (o) => ({ id: o.id, name: or(o.name, 'Portfolio') })],
  ['FM Epic', (o, w) => ({ id: o.id, name: or(o.name, 'Epic'), portfolioId: fk(idSet(w, 'PORTFOLIO_ITEMS'), o.portfolioId) })],
  ['FM Feature', (o, w) => ({ id: o.id, name: or(o.name, 'Feature'), epicId: fk(idSet(w, 'EPICS'), o.epicId) })],
  ['FM Story', (o, w) => ({ id: o.id, name: or(o.name, 'Story'), featureId: fk(idSet(w, 'FEATURES'), o.featureId) })],
  ['FM Release', (o) => ({ id: o.id, name: or(o.name, 'Release') })],
  ['FM Release Items',
  (o, _w, i) => ({ id: or(o.id, `ri-import-${i}`), releaseId: o.releaseId, itemType: or(o.itemType, 'Fix'), itemId: o.itemId ?? null,
  label: o.label ?? null })],
  ['FM Release Candidates',
  (o, w) => ({ id: o.id, name: or(o.name, 'RC'), releaseId: fk(idSet(w, 'RELEASES'), o.releaseId), cutAt: o.cutAt ?? null, status: or(o.status, 'Draft') })],
  ['FM Environments',
  (o, w) => ({ id: o.id, name: or(o.name, 'Environment'), seq: num(o.seq) || 0,
  ...(list(w, 'ENVIRONMENTS').find((e) => e.id === o.id && e.isProd) ? { isProd: true } : {}) })],
  ['FM Approvals', (o, w) => ({ id: o.id, releaseCandidateId: fk(idSet(w, 'RELEASE_CANDIDATES'), o.releaseCandidateId), approver: o.approver ?? '',
  decision: or(o.decision, 'Pending'), requestedAt: o.requestedAt ?? null, decidedAt: o.decidedAt ?? null })],
  ['FM Deployments',
  (o, w) => ({ id: o.id, releaseCandidateId: fk(idSet(w, 'RELEASE_CANDIDATES'), o.releaseCandidateId),
  environmentId: fk(idSet(w, 'ENVIRONMENTS'), o.environmentId), deployedAt: o.deployedAt ?? null, status: or(o.status, 'Success') })],
  ['FM Commits', (o) => ({ id: o.id, taskId: validTask(o.taskId) ? o.taskId : null, message: o.message ?? '', author: o.author ?? '',
  committedAt: o.committedAt ?? null })],
  ['FM Builds', (o) => ({ id: o.id, name: or(o.name, 'Build'), status: or(o.status, 'Success'), builtAt: o.builtAt ?? null })],
  ['FM Build Artifacts',
  (o, w) => ({ id: o.id, name: or(o.name, 'Build Artifact'), buildId: fk(idSet(w, 'BUILDS'), o.buildId), type: or(o.type, 'Package'),
  version: or(o.version, '0.1.0') })],
  ['FM Quality Gates',
  (o, w) => ({ id: o.id, name: or(o.name, 'Quality Gate'), buildArtifactId: fk(idSet(w, 'BUILD_ARTIFACTS'), o.buildArtifactId),
  result: or(o.result, 'Pending') })],
  ['FM Monitoring',
  (o, w) => ({ id: o.id, deploymentId: fk(idSet(w, 'DEPLOYMENTS'), o.deploymentId), timestamp: o.timestamp ?? null, description: o.description ?? '',
  severity: or(o.severity, 'Info') })],
  ['FM Feedback', (o) => ({ id: o.id, description: o.description ?? '', createdAt: o.createdAt ?? null, backlogItemId: o.backlogItemId ?? null })],
  ['FM Backlog', (o) => ({ id: o.id, description: o.description ?? '', status: or(o.status, 'New'), sourceFeedbackId: o.sourceFeedbackId ?? null })],
];

function read({ rows, w }: ReadCtx): void {
  const s = rows('FM Singletons');
  if (s) s.slice(1).filter((x) => str(x[0]) !== '').forEach((x) => {
    const field = str(x[0]), val = x[1] == null || x[1] === '' ? '' : x[1];
    if (field === 'Vision statement') w.VISION = { ...w.VISION, statement: longText(val, 2000) };
    if (field === 'Integrated Product name') w.INTEGRATED_PRODUCT = { ...w.INTEGRATED_PRODUCT, name: cleanText(val, 120) || 'Integrated Product' };
    if (field === 'Integrated Product — included Build Artifact IDs') w.INTEGRATED_PRODUCT = { ...w.INTEGRATED_PRODUCT,
      buildArtifactIds: String(val).split(';').map((x2) => x2.trim()).filter(Boolean) };
  });
  BUILD.forEach(([name, build]) => {
    memo.clear();
    const spec = FM_SPECS.find((p) => p.sheet === name)!, fields = spec.cols.map((c) => c[2]), t = table(rows(name), fields);
    if (!t) return;
    if (name === 'FM Release Items') {
      const valid = idSet(w, 'RELEASES');
      w[spec.key] = t.filter((o) => o.releaseId && valid.has(o.releaseId)).map((o, i) => build(o, w, i));
    }
    else if (name !== 'FM Environments' || t.length) w[spec.key] = t.map((o, i) => build(o, w, i));
    if (name === 'FM Feature') linkPhases(w, t);
  });
}
/** The "SDLC Phase IDs" column rebuilds each phase's feature list. */
function linkPhases(w: ParamsDoc, t: Obj[]): void {
  const by = new Map<string, string[]>();
  t.forEach((o) => by.set(String(o.id), String(o.phaseIds ?? '').split(';').map((x) => x.trim()).filter(Boolean)));
  w.fmPhaseFeatures = w.fmPhaseFeatures.map((p) => ({ ...p, featureIds: [...by.keys()].filter((fid) => (by.get(fid) ?? []).includes(p.id)) }));
}

export const factoryMeta: SheetFamily = { sheets: ['FM Singletons', ...FM_SPECS.map((s) => s.sheet)], write, read };
