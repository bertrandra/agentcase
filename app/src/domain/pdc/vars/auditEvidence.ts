import { evlModel, EVL_STAGE_LABEL } from '../../model/evidence';
import { flowModel } from '../../model/flow';
import { evidenceOf, flowOf } from '../../model/modelState';
import type { AuditCheck } from './auditModel';
import type { VarRuntime } from './types';

type RtCheck = (c: Parameters<AuditCheck>[0], rt: VarRuntime) => string | null;

/** Flow (CC-FL) and evidence ledger (CC-EV) checks; inert while their stage flag is off. */
export const EVIDENCE_CHECKS: [id: string, check: RtCheck][] = [
  ['CC-FL-01', (c) => {
    if (!c.s.MODEL.FLAGS.flow) return null;
    const share = flowOf(c.s.MODEL).throughputInShare;
    if (!(share >= 0 && share <= 100)) return 'throughputInShare out of [0,100] bounds';
    return share === 0 && Math.abs(flowModel(c).flowNpv) > 1e-6 ? 'share=0 but flow value is nonzero — the same capacity is being counted as both cost-out and throughput-in' : null;
  }],
  ['CC-EV-01', (c, rt) => {
    if (!c.s.MODEL.FLAGS.evl) return null;
    const ev = evidenceOf(c.s.MODEL), bad = evlModel(c, rt.tornado).drivers.filter((d) => d.weight > 1e-9 && !ev.drivers[d.id]).map((d) => d.label);
    return bad.length ? `material driver(s) with no evidence tier (defaulting to ASSUMPTION): ${bad.join(', ')}` : null;
  }],
  ['CC-EV-02', (c, rt) => {
    if (!c.s.MODEL.FLAGS.evl) return null;
    const bad = evlModel(c, rt.tornado).drivers.filter((d) => d.tier === 'MEASURED' && d.effectiveTier === 'BENCHMARK').map((d) => d.label);
    return bad.length ? `MEASURED without a source or with a stale (>18mo) asOf, used as BENCHMARK instead: ${bad.join(', ')}` : null;
  }],
  ['CC-EV-03', (c, rt) => {
    if (!c.s.MODEL.FLAGS.evl) return null;
    const e = evlModel(c, rt.tornado);
    return e.meetsExpectation === false ? `grade ${e.grade} is below the ${e.expectedGrade} expected at ${EVL_STAGE_LABEL[e.stage] || e.stage} - see the upgrade path, not a gate` : null;
  }],
];
