/** @calc-zone process-model */
import { drawingOf, type DrawShape } from './drawing';
import { addActivity } from './editActivity';
import { findById, moveActivity, setDiagram } from './editMore';
import { editById, editWhere } from './editTree';
import { activityDefaults } from './importDefaults';
import { readProcess } from './read';
import type { CatArtefact } from './types';
import { attr, NS, text, withAttrs, withChildren, type XDocument, type XElement } from './xml';

/**
 * An activity put in a cell of the diagram (owner's request 2026-11-04: drag an activity across the lanes and the phases; the canvas "+"): its phase
 * (`moveActivity`: the flows of its old chain are bridged), its role (the human performer: the role of the target lane, which is also the skill
 * its effort is priced at) and its shape, in a free slot of the cell (phase × lane); a full lane grows by one row, the shapes below it move down.
 * The lanes are drawn per team skill, so a role lane is found by its label; the agents' and Cross-cutting lanes set no role.
 */
const TW = 100, TH = 80, G = 20;
const same = (d: XDocument, root: XElement): XDocument => (root === d.root ? d : { ...d, root });
const centre = (s: DrawShape): [number, number] => [s.x + s.w / 2, s.y + s.h / 2];
const holds = (c: DrawShape, [x, y]: [number, number]): boolean => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
export const isRoleLane = (l: DrawShape): boolean => l.kind === 'lane' && !/agent|cross-cutting/i.test(`${l.id} ${l.label}`);
const isAgentsLane = (l: DrawShape): boolean => l.kind === 'lane' && /agent/i.test(`${l.id} ${l.label}`);

/** The role (actor id) a lane stands for: the role named like its team skill, else the first role of that team skill. */
export function roleOfLane(d: XDocument, lane: string): string | undefined {
  const roles = readProcess(d).actors.filter((a) => a.kind === 'role' && a.teamSkill === lane);
  return (roles.find((a) => a.name === lane) ?? roles[0])?.id;
}

/** The human performer of activity `id` set to actor `role` (the same document when it has none, or already that one). */
export function setActivityRole(d: XDocument, id: string, role: string): XDocument {
  const v = readProcess(d), a = v.activities.find((x) => x.id === id);
  if (!a || a.humanPerformer === role || !v.actors.some((r) => r.id === role && r.kind === 'role')) return d;
  const ref = (e: XElement): XElement => withChildren(e, e.children.map((c) => (c.kind === 'element' && c.ns === NS.bpmn && c.local === 'resourceRef'
    ? withChildren(c, [text(role)]) : c)));
  return same(d, editById(d.root, id, (t) => withChildren(t, t.children.map((c) => (c.kind === 'element' && c.ns === NS.bpmn
    && c.local === 'humanPerformer' ? ref(c) : c)))));
}

/** Every shape at or below `at` moves down by `by`, every shape across it grows by `by` (a lane, its pool and the phases), the flows follow. */
export function insertBand(d: XDocument, at: number, by: number): XDocument {
  const num = (e: XElement, k: string): number => Number(attr(e, k) ?? 0);
  return same(d, editWhere(d.root, (e) => (e.ns === NS.dc && e.local === 'Bounds') || (e.ns === NS.di && e.local === 'waypoint'), (e) => {
    const y = num(e, 'y');
    if (y >= at) return withAttrs(e, { y: y + by });
    return e.local === 'Bounds' && y + num(e, 'height') > at ? withAttrs(e, { height: num(e, 'height') + by }) : e;
  }));
}

/** A free slot for an activity in the cell (phase box × lane) of the document's drawing; `null` when the lane has no room left. */
function slotIn(shapes: DrawShape[], id: string, phase: DrawShape, lane: DrawShape): { x: number; y: number } | null {
  const others = shapes.filter((s) => s.kind === 'activity' && s.id !== id && holds(lane, centre(s)));
  const top = others.length ? Math.min(...others.map((s) => s.y)) : lane.y + 2 * G, cols = Math.max(1, Math.floor((phase.w - G) / (TW + G)));
  for (let row = 0; top + row * (TH + G) + TH <= lane.y + lane.h; row++) {
    for (let c = 0; c < cols; c++) {
      const x = phase.x + G + c * (TW + G), y = top + row * (TH + G);
      if (!others.some((s) => s.x < x + TW && x < s.x + s.w && s.y < y + TH && y < s.y + s.h)) return { x, y };
    }
  }
  return null;
}

/**
 * `process.placeActivity`: activity `id` to phase `phase` (unchanged when it is its phase) and, when `lane` names a role lane, to that lane's
 * role, its shape in a free slot of the cell. Refused (the same document) when the activity is unknown or a move its rework loop forbids.
 */
export function placeActivity(cur: XDocument, id: string, phase: string, lane?: string): XDocument {
  const a = readProcess(cur).activities.find((x) => x.id === id);
  if (!a) return cur;
  let d = a.phase === phase ? cur : moveActivity(cur, id, phase);
  if (readProcess(d).activities.find((x) => x.id === id)?.phase !== phase) return cur;
  const role = lane ? roleOfLane(d, lane) : undefined;
  if (role) d = setActivityRole(d, id, role);
  const v = readProcess(d), me = v.activities.find((x) => x.id === id)!, shapes = drawingOf(d).shapes;
  const was = shapes.find((s) => s.id === id && !s.placed), lanes = shapes.filter((s) => s.kind === 'lane');
  const skill = v.actors.find((r) => r.id === me.humanPerformer)?.teamSkill, agents = lanes.find(isAgentsLane);
  // the lane: an agent's activity drawn in the agents' lane stays there (only its role changes); a person's activity never goes there; else the
  // lane asked, else its role's
  const before = drawingOf(cur).shapes, old = before.find((s) => s.id === id && !s.placed), oldAgents = before.find(isAgentsLane);
  const keepAgents = me.type === 'Agent' && agents && (lane === agents.label || (old && oldAgents && holds(oldAgents, centre(old))));
  const into = keepAgents ? agents : lanes.find((l) => l.label === lane && l !== agents) ?? lanes.find((l) => l.label === skill);
  const box = shapes.find((s) => s.kind === 'phase' && s.id === phase);
  if (!into || !box || !findById(d.root, id)) return d;
  if (was && holds(into, centre(was)) && holds(box, centre(was))) return d;   // already in its cell: it stays where it is
  const slot = slotIn(shapes, id, box, into);
  if (slot) return setDiagram(d, id, { ...slot, w: TW, h: TH });
  const grown = insertBand(d, into.y + into.h - 15, TH + G), again = drawingOf(grown).shapes;
  const l2 = again.find((s) => s.id === into.id), b2 = again.find((s) => s.id === box.id);
  const s2 = l2 && b2 ? slotIn(again, id, b2, l2) : null;
  return s2 ? setDiagram(grown, id, { ...s2, w: TW, h: TH }) : grown;
}

/** `process.addActivity` from the canvas: the activity added, then placed in its phase and its role's lane like a dropped one. */
export function addActivityAt(d: XDocument, a: CatArtefact & { inScope?: boolean }, lane?: string): XDocument {
  const added = addActivity(d, a);
  return added === d ? d : placeActivity(added, a.id, a.phase, lane);
}

/** The role chosen in the activity's panel: the human performer set, and the shape moved to that role's lane when it was in another role's lane. */
export function changeActivityRole(d: XDocument, id: string, role: string): XDocument {
  const r = setActivityRole(d, id, role), a = readProcess(r).activities.find((x) => x.id === id);
  return r === d || !a ? r : placeActivity(r, id, a.phase);
}

/** A new activity for the canvas "+": the defaults of a human task of `phase` (`activityDefaults`), a fresh id `ACT<n>`; null without that phase. */
export function newCanvasActivity(d: XDocument, phase: string): CatArtefact | null {
  const v = readProcess(d);
  if (!v.phases.some((p) => p.id === phase)) return null;
  let n = v.activities.length + 1;
  while (findById(d.root, `ACT${n}`)) n++;
  return { ...activityDefaults(v, phase, 'userTask', undefined), id: `ACT${n}`, name: 'New activity', deliverable: '' } as CatArtefact;
}
