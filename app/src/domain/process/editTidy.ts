/** @calc-zone process-model */
import { drawingOf, type DrawShape } from './drawing';
import { setDiagram } from './editMore';
import { insertBand } from './editPlace';
import { arrangeSub } from './editSubLayout';
import { boxes, redraw, same } from './editSubTree';
import { editById } from './editTree';
import { readProcess } from './read';
import { withAttrs, type XDocument } from './xml';

/**
 * "Tidy the layout" of a phase (owner's request 2026-11-05: moves, added activities and sub-processes leave gaps and odd places): in each lane, the
 * phase's activities are put back on a regular grid from the lane's top, in their reading order (row, then column), the lane growing when it needs
 * more rows; each sub-process's activities are laid out together again at the right; the flows are redrawn. Phases and roles do not change, so
 * no figure moves. One undoable step.
 */
const TW = 100, TH = 80, G = 20;
const centreIn = (s: DrawShape, c: DrawShape): boolean => s.y + s.h / 2 >= c.y && s.y + s.h / 2 < c.y + c.h;

export function tidyPhase(cur: XDocument, phase: string): XDocument {
  const sh = drawingOf(cur).shapes, box = sh.find((s) => s.kind === 'phase' && s.id === phase);
  if (!box) return cur;
  const v = readProcess(cur), mine = new Set(v.activities.filter((a) => a.phase === phase && !a.sub).map((a) => a.id));
  const acts = sh.filter((s) => s.kind === 'activity' && mine.has(s.id)), cols = Math.max(1, Math.floor((box.w - G) / (TW + G)));
  let d = cur;
  // bottom lane first: a lane that grows moves only the lanes below it, already laid out
  for (const lane of sh.filter((s) => s.kind === 'lane').sort((a, b) => b.y - a.y)) {
    const items = acts.filter((s) => centreIn(s, lane)).sort((a, b) => a.y - b.y || a.x - b.x);
    if (!items.length) continue;
    const top = lane.y + 2 * G, rows = Math.ceil(items.length / cols), need = top + rows * (TH + G) - (lane.y + lane.h);
    if (need > 0) d = insertBand(d, lane.y + lane.h - 15, need);
    items.forEach((s, i) => { d = setDiagram(d, s.id, { x: box.x + G + (i % cols) * (TW + G), y: top + Math.floor(i / cols) * (TH + G), w: TW, h: TH }); });
  }
  for (const s of v.subProcesses ?? []) if (s.phase === phase) d = arrangeSub(d, s.id);
  const v2 = readProcess(d), at = boxes(v2), here = new Set([phase, ...(v2.subProcesses ?? []).filter((s) => s.phase === phase).map((s) => s.id)]);
  const flows = v2.flows.filter((f) => here.has(f.container) && !f.rework);
  return same(d, flows.reduce((r, f) => redraw(r, f.id, at.get(f.source), at.get(f.target)), d.root));
}

/** Every phase tidied (`tidyPhase`), one step. */
export const tidyAll = (d: XDocument): XDocument => readProcess(d).phases.reduce((acc, p) => tidyPhase(acc, p.id), d);

/** `process.renameSubProcess`: the sub-process's name (refused, the same document, when empty or unknown). */
export function renameSubProcess(d: XDocument, sub: string, name: string): XDocument {
  if (!name.trim() || !readProcess(d).subProcesses?.some((s) => s.id === sub)) return d;
  return same(d, editById(d.root, sub, (e) => withAttrs(e, { name: name.trim() })));
}
