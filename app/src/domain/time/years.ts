import type { MonthRow } from './rows';

export interface YearRow {
  yearIndex: number; monthStartIndex: number; monthEndIndex: number; monthsIncluded: number; isPartialYear: boolean;
  savings: number; teamCost: number; tokenCost: number; totalRunCost: number; infrastructureCost: number; runTeamCost: number; knowledgeHubCost: number;
  knowledgeTransferAvoided: number; verificationTaxCost: number; externalReworkCost: number; complianceTaxCost: number; setupCost: number;
  netAfterSetup: number; humanFteAvg: number; humanFteEnd: number; agentVfteAvg: number; agentVfteEnd: number; agentVfteRawEnd: number;
  runTeamFteEnd: number; totalHumanFteEnd: number; adoptionEndPct: number; adoptionAvgPct: number; cumulativeCashFlowEnd: number;
  paybackReachedInYear: boolean; maturityEnd: string;
}

/** Aggregate months [first..last] of one year (flows are sums, FTE/adoption are year-end samples). */
export function aggregateYear(y: number, N: number, monthAt: (t: number) => MonthRow, cumulativeAt: (t: number) => number, payback: number | null): YearRow {
  const first = (y - 1) * 12 + 1, last = Math.min(y * 12, N);
  const sum = { sav: 0, team: 0, token: 0, run: 0, setup: 0, net: 0, kh: 0, h: 0, a: 0, infra: 0, rt: 0, kt: 0, vt: 0, le: 0, ct: 0, ad: 0 };
  for (let t = first; t <= last; t++) {
    const r = monthAt(t);
    sum.sav += r.grossSavings; sum.team += r.teamCost; sum.token += r.tokenCost; sum.run += r.totalRunCost; sum.setup += r.setupCost;
    sum.net += r.netSavings; sum.kh += r.knowledgeHubCost; sum.infra += r.infrastructureCost; sum.rt += r.runTeamCost;
    sum.kt += r.knowledgeTransferAvoided; sum.vt += r.verificationTaxCost; sum.le += r.externalReworkCost; sum.ct += r.complianceTaxCost;
    sum.h += r.humanFte; sum.a += r.agentVfte; sum.ad += r.adoptionRampPct;
  }
  const cnt = last - first + 1, end = monthAt(last);
  return {
    yearIndex: y, monthStartIndex: first, monthEndIndex: last, monthsIncluded: cnt, isPartialYear: cnt < 12,
    savings: sum.sav, teamCost: sum.team, tokenCost: sum.token, totalRunCost: sum.run, infrastructureCost: sum.infra, runTeamCost: sum.rt,
    knowledgeHubCost: sum.kh, knowledgeTransferAvoided: sum.kt, verificationTaxCost: sum.vt, externalReworkCost: sum.le, complianceTaxCost: sum.ct,
    setupCost: sum.setup, netAfterSetup: sum.net, humanFteAvg: sum.h / cnt, humanFteEnd: end.humanFte, agentVfteAvg: sum.a / cnt, agentVfteEnd: end.agentVfte,
    agentVfteRawEnd: end.agentVfteRaw != null ? end.agentVfteRaw : end.agentVfte, runTeamFteEnd: end.runTeamFte || 0,
    totalHumanFteEnd: end.humanFte + (end.runTeamFte || 0), adoptionEndPct: end.adoptionRampPct, adoptionAvgPct: sum.ad / cnt,
    cumulativeCashFlowEnd: cumulativeAt(last), paybackReachedInYear: payback != null && payback >= first && payback <= last, maturityEnd: end.maturityLevel,
  };
}
