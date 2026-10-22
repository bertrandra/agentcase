import { scheduledProducts } from './timeline';
import type { Portfolio } from './types';

/** An amount of entry headcount (ETP) under a label (skill, grade or location). */
export interface TeamBucket { key: string; etp: number }
/** One skill x grade x location line of the selection, merged over the products. */
export interface TeamLine { skill: string; grade: string; loc: string; etp: number }
export interface TeamProductRow { id: string; name: string; wave: string; planned: boolean; archived: boolean; etp: number; lines: number }

/** The entry teams of a set of products, added up (aggregate view of "Input team"). */
export interface TeamAggregate {
  /** one line per requested product (unknown ids are ignored), in the order asked */
  products: TeamProductRow[];
  /** entry headcount of the selection: the sum of the product lines */
  total: number;
  bySkill: TeamBucket[];
  byGrade: TeamBucket[];
  byLoc: TeamBucket[];
  lines: TeamLine[];
}

const etpOf = (x: number): number => +x || 0;

function add<K>(m: Map<string, K & { etp: number }>, key: string, make: () => K & { etp: number }, etp: number): void {
  const cur = m.get(key) ?? make();
  cur.etp += etp;
  m.set(key, cur);
}

/**
 * Entry teams of the given products added up by skill, grade, location and by skill x grade x location, with a per-product table. Archived and
 * unplanned products are counted when asked for (the caller chooses the selection) and flagged `planned: false`; a team is each product's own (spec F2).
 */
export function aggregateTeams(pf: Portfolio, productIds: string[]): TeamAggregate {
  const planned = new Set(scheduledProducts(pf).map((s) => s.product.id)), byId = new Map(pf.products.map((p) => [p.id, p]));
  const skill = new Map<string, TeamBucket>(), grade = new Map<string, TeamBucket>(), loc = new Map<string, TeamBucket>(), lines = new Map<string, TeamLine>();
  const products: TeamProductRow[] = [];
  let total = 0;
  for (const id of productIds) {
    const p = byId.get(id);
    if (!p) continue;
    let etp = 0;
    for (const r of p.teamIn) {
      const e = etpOf(r.etp);
      etp += e;
      add(skill, r.skill, () => ({ key: r.skill, etp: 0 }), e);
      add(grade, r.grade, () => ({ key: r.grade, etp: 0 }), e);
      add(loc, r.loc, () => ({ key: r.loc, etp: 0 }), e);
      add(lines, `${r.skill}|${r.grade}|${r.loc}`, () => ({ skill: r.skill, grade: r.grade, loc: r.loc, etp: 0 }), e);
    }
    total += etp;
    products.push({ id, name: p.name, wave: pf.waves.find((w) => w.id === p.waveId)?.name ?? '', planned: planned.has(id), archived: !!p.archived, etp, lines: p.teamIn.length });
  }
  return { products, total, bySkill: [...skill.values()], byGrade: [...grade.values()], byLoc: [...loc.values()], lines: [...lines.values()] };
}
