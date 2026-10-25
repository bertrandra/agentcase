/** @calc-zone exports */
import agentCatalog from '@/domain/verifyA/agentCatalog.json';
import { LOOP_PAIRS } from '@/domain/catalog';
import { blue, frz, geDV, grey, head, rangeDV, sheet } from '../kit';
import { num, str } from '../safe';
import type { ReadCtx, SheetFamily, WriteCtx } from '../types';

interface Agent { id: string; skill: string; aiAuth: string; artifactIds: string[]; capacity: number }
const AGENTS = agentCatalog as Agent[];

function writeAgents({ wb, c }: WriteCtx): void {
  const ws = sheet(wb, 'Agent Catalog', [['ID', 8], ['Skill', 16], ['Auth level', 22], ['Capacity (runs/day)', 18], ['Avg agentSup %', 14], ['Artefacts', 40]]);
  AGENTS.forEach((ag) => {
    const arts = ag.artifactIds.map((id) => c.a.sdlc.find((a) => a.id === id)).filter((a) => a !== undefined);
    const avg = arts.length ? Math.round(arts.reduce((s, a) => s + (a.agentSup || 0), 0) / arts.length) : '';
    const row = ws.addRow([ag.id, ag.skill, ag.aiAuth, ag.capacity, avg, ag.artifactIds.join(', ')]);
    blue(row.getCell(4)); row.getCell(4).dataValidation = geDV(0, 'Capacity ≥ 0'); grey(row.getCell(5)); grey(row.getCell(6));
  });
  head(ws); frz(ws);
}
function writeLoops({ wb }: WriteCtx): void {
  const ws = sheet(wb, 'Loop Pairs', [['ID', 8], ['Label', 26], ['Artefact A', 11], ['Artefact B', 11], ['Internal iterations', 16],
    ['External rework %', 16], ['From phase', 11], ['To phase', 11], ['Cost share %', 12]]);
  LOOP_PAIRS.forEach((lp) => {
    const row = ws.addRow([lp.id, lp.label, (lp as unknown as { artA: string }).artA, (lp as unknown as { artB: string }).artB, lp.internalIter,
      Math.round((lp.extReworkPct || 0) * 100), lp.extFrom || '', lp.extTo || '', Math.round((lp.extCostShare || 0) * 100)]);
    [3, 4, 5, 7, 8, 9].forEach((i) => grey(row.getCell(i)));
    blue(row.getCell(6)); row.getCell(6).dataValidation = rangeDV(0, 100, true, 'Rework % (0-100)');
  });
  head(ws); frz(ws);
}

/**
 * The legacy page applied these two editable columns to module-level constants that its snapshots never saved, so they only lived until the next reload.
 * Here the catalogues are immutable code: the sheets are read for validation and a differing value is reported instead of being silently dropped.
 */
function readAgents({ rows, notes }: ReadCtx): void {
  const r = rows('Agent Catalog'); if (!r) return;
  const diff = r.slice(1).filter((x) => { const ag = AGENTS.find((a) => a.id === str(x[0])), cap = num(x[3]);
    return ag && !Number.isNaN(cap) && cap >= 0 && cap !== ag.capacity; }).length;
  if (diff) notes.push(`Agent Catalog: ${diff} capacity value(s) differ from the catalogue — reference only, not stored in the case.`);
}
function readLoops({ rows, notes }: ReadCtx): void {
  const r = rows('Loop Pairs'); if (!r) return;
  const diff = r.slice(1).filter((x) => { const lp = LOOP_PAIRS.find((p) => p.id === str(x[0])), pct = num(x[5]);
    return lp && lp.extFrom && lp.extTo && !Number.isNaN(pct) && Math.round(pct) !== Math.round((lp.extReworkPct || 0) * 100); }).length;
  if (diff) notes.push(`Loop Pairs: ${diff} external rework value(s) differ from the catalogue — reference only, not stored in the case.`);
}

export const agentCatalogSheet: SheetFamily = { sheets: ['Agent Catalog'], write: writeAgents, read: readAgents };
export const loopPairsSheet: SheetFamily = { sheets: ['Loop Pairs'], write: writeLoops, read: readLoops };
