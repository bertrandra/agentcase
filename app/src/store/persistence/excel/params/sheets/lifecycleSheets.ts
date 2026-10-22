/** @calc-zone exports */
import { LOCATIONS, PHASES } from '@/domain/catalog';
import { lifecycleAutoPosture, lifecycleBlend, lifecycleWeight, statusTable } from '@/domain/lifecycle';
import { lifecycleStatusLabel } from '@/domain/verdict/context';
import type { CaseState } from '@/domain/types/state';
import { skillMapOf } from '@/domain/baseline/skills';
import { allArtefactSkills, locSplitOf, teamSkillList, tobeComposition, type LocSplit } from '@/domain/verifyA';
import { frz, head, sheet } from '../kit';
import { cleanText, num, okKey, str } from '../safe';
import type { ParamsDoc, ReadCtx, SheetFamily, WriteCtx } from '../types';

const PHASE_IDS = PHASES.map((p) => p.id);
const cs = (d: ParamsDoc) => d as unknown as CaseState;

function writeLifecycle({ wb, d }: WriteCtx): void {
  const s = cs(d), table = statusTable(s), ws = sheet(wb, 'Status Lifecycle', [['Status', 30], ...PHASE_IDS.map((p): [string, number] => [p, 7])]);
  ws.addRow(['Lifecycle weighting enabled', d.lifecycleUse ? 'Yes' : 'No']);
  ws.addRow(['Lifecycle position (0-100)', Math.round(d.lifecyclePos)]);
  ws.addRow(['Current blended status', lifecycleStatusLabel(s)]);
  ws.addRow([]);
  ws.addRow(['STATUS / PHASE weight matrix', ...PHASE_IDS]);
  table.forEach((t) => ws.addRow([t.label ?? t.id, ...PHASE_IDS.map((p) => t.weights[p] ?? 1.0)]));
  ws.addRow([]);
  ws.addRow(['Interpolated weights at current position', ...PHASE_IDS.map((p) => +lifecycleWeight(s, p).toFixed(3))]);
  ws.addRow([]);
  ws.addRow(['Automation posture by status', ...table.map((t) => t.autoPosture)]);
  ws.addRow(['Interpolated automation posture at current position', +lifecycleAutoPosture(s).toFixed(3)]);
  ws.getRow(1).font = { bold: true }; ws.getRow(5).font = { bold: true }; frz(ws);
}
/** Reads the two selection cells, the status × phase weight matrix and the posture row; the full table is stored back. */
function readLifecycle({ rows, w }: ReadCtx): void {
  const r = rows('Status Lifecycle'); if (!r) return;
  r.forEach((x) => {
    const key = str(x[0]).toLowerCase();
    if (key === 'lifecycle weighting enabled') w.lifecycleUse = /^(yes|y|true)$/.test(str(x[1]).toLowerCase());
    if (key === 'lifecycle position (0-100)') { const n = num(x[1]); if (!Number.isNaN(n)) w.lifecyclePos = Math.max(0, Math.min(100, n)); }
  });
  const table = statusTable(cs(w)).map((t) => ({ id: t.id, label: t.label, autoPosture: t.autoPosture, weights: { ...t.weights } }));
  r.forEach((x) => {
    const t = table.find((e) => e.label === str(x[0]));
    if (t) PHASE_IDS.forEach((p, i) => { const n = num(x[i + 1]); if (!Number.isNaN(n)) t.weights[p] = n; });
  });
  const posture = r.find((x) => str(x[0]).toLowerCase() === 'automation posture by status');
  if (posture) table.forEach((t, i) => { const n = num(posture[i + 1]); if (!Number.isNaN(n)) t.autoPosture = n; });
  w.statusLifecycle = table.map(({ id, autoPosture, weights }) => ({ id, autoPosture, weights }));
  // the Scope section's lifecycle controls mirror the state (legacy syncLifecycleControls)
  const b = lifecycleBlend(cs(w));
  w.dom.checked.lcScopeUse = w.lifecycleUse; w.dom.values.lcScopePos = String(w.lifecyclePos);
  w.dom.values.lcScopeSelect = String(Math.round(((b.frac < 0.5 ? b.loIdx : b.hiIdx) / (table.length - 1)) * 100));
}

/** TO-BE team composition at the horizon end (reference only: computed by the model, never read back). */
function writeTobe({ wb, live }: WriteCtx): void {
  const l = live(), last = l.eng.years().length - 1, comp = tobeComposition(l, last), ey = l.eng.years()[last];
  const lbl = `Y${comp.years.length}`;
  const ws = sheet(wb, 'TO-BE Team', [['Skill', 18], ['AS-IS FTE', 11], [`TO-BE Human FTE (${lbl})`, 20], [`TO-BE Agent vFTE (${lbl})`, 20], ['Human Delta', 12], ['Auto %', 9]]);
  comp.rows.forEach((r) => { const y = r.perYear[last] ?? r.perYear[r.perYear.length - 1]!; ws.addRow([r.skill, +r.asisFTE.toFixed(2), +y.human.toFixed(2), +y.agent.toFixed(2), +(y.human - r.asisFTE).toFixed(2), Math.round(y.autoPct)]); });
  ws.addRow(['TOTAL', +comp.tot.asis.toFixed(2), +(ey?.humanFteEnd ?? 0).toFixed(2), +(ey?.agentVfteEnd ?? 0).toFixed(2), '', '']);
  head(ws); frz(ws);
}
function writeSkillMap({ wb, d, live }: WriteCtx): void {
  const ws = sheet(wb, 'Skill Map', [['Artefact skill', 18], ['Team skill', 18]]), map = skillMapOf(cs(d));
  allArtefactSkills(live()).forEach((a) => ws.addRow([a, map[a] || a]));
  head(ws); frz(ws);
}
function readSkillMap({ rows, w }: ReadCtx): void {
  const r = rows('Skill Map'); if (!r) return;
  const map = { ...skillMapOf(cs(w)) };
  r.slice(1).forEach((x) => { const a = cleanText(x[0], 60), t = cleanText(x[1], 60); if (a && t && okKey(a)) map[a] = t; });
  w.skillMap = map;
}
function writeSplit({ wb, d }: WriteCtx): void {
  const names = LOCATIONS.map((l) => l.name), ws = sheet(wb, 'TO-BE Location Split', [['Skill', 18], ...names.map((n): [string, number] => [n, 11])]), split = locSplitOf(cs(d));
  teamSkillList(cs(d)).forEach((ts) => ws.addRow([ts, ...names.map((n) => +(split[ts] ?? {})[n]! || 0)]));
  head(ws); frz(ws);
}
function readSplit({ rows, w }: ReadCtx): void {
  const r = rows('TO-BE Location Split'); if (!r || r.length <= 1) return;
  const hdr = (r[0] ?? []).slice(1).map((h) => cleanText(h, 40)), ns: LocSplit = {};
  r.slice(1).forEach((x) => {
    const ts = cleanText(x[0], 60); if (!ts || !okKey(ts)) return;
    const row: Record<string, number> = (ns[ts] = {});
    hdr.forEach((h, i) => { const n = num(x[i + 1]); if (h && okKey(h)) row[h] = Number.isNaN(n) ? 0 : n; });
  });
  if (Object.keys(ns).length) w.tobeLocSplit = ns;
}

export const statusLifecycle: SheetFamily = { sheets: ['Status Lifecycle'], write: writeLifecycle, read: readLifecycle };
export const tobeTeam: SheetFamily = { sheets: ['TO-BE Team'], write: writeTobe, read: () => undefined };
export const skillMap: SheetFamily = { sheets: ['Skill Map'], write: writeSkillMap, read: readSkillMap };
export const tobeSplit: SheetFamily = { sheets: ['TO-BE Location Split'], write: writeSplit, read: readSplit };
