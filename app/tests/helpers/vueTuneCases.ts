import * as D from '@/domain/portfolio';
import type { Portfolio } from '@/domain/portfolio';
import { fmtEurK } from '@/ui/format';
import { eur, eurK, fix } from '@/ui/sections/tuneB/fmt';

/** The Tune sections of vue-tune.test.tsx: per section, its title and table caption, and the figures each product row and the roll-up show
 * (computed by the domain). */
export interface Case {
  id: string; title: RegExp; caption: string; input: boolean; drill?: (id: string, p: Portfolio) => string; spread?: string;
  rows: (p: Portfolio, ids: string[]) => { id: string; texts: string[] }[]; total?: (p: Portfolio, ids: string[]) => string[];
}
const U = (k: string) => k.toUpperCase();
export const CASES: Case[] = [
  { id: 'maturity-map', title: /Maturity levels/, caption: 'Maturity thresholds by product', input: true, spread: 'Spread of the thresholds',
    rows: (p, ids) => D.aggMaturityMap(p, ids).rows.map((r) =>
      ({ id: r.id, texts: [r.ramp.map((x) => Math.round(x)).join(' / '), `L${r.reached} (adoption L${r.adoptionLevel}, share L${r.shareLevel}`] })) },
  { id: 'readiness', title: /AI Readiness Index/, caption: 'AI readiness by product', input: false,
    drill: (id, p) => { const r = D.aggReadiness(p, [id]).rows[0]!; return `${r.hri}/100 · ${r.hriLabel}`; },
    spread: 'Spread of the readiness',
    rows: (p, ids) => D.aggReadiness(p, ids).rows.map((r) => ({ id: r.id, texts: [String(Math.round(r.index ?? 0)), r.band, String(r.answered)] })),
    total: (p, ids) => { const a = D.aggReadiness(p, ids); return [`${a.assessed} of ${a.rows.length} assessed`, String(Math.round(a.index.avg))]; } },
  { id: 'lifecycle-edit', title: /Product profile & phase coefficients/, caption: 'Profile and postures by product', input: true,
    spread: 'Spread of the lifecycle inputs',
    rows: (p, ids) => D.aggLifecycle(p, ids).rows.map((r) => ({ id: r.id, texts: [r.profile, r.pos.toFixed(0), ...r.postures.map((x) => x.toFixed(2))] })) },
  { id: 'token-econ', title: /Token economics/, caption: 'Token usage and cost by product', input: false,
    drill: (id, p) => eur(D.aggTokens(p, [id]).rows[0]!.costEnd),
    spread: 'Spread of the token cost',
    rows: (p, ids) => D.aggTokens(p, ids).rows.map((r) => ({ id: r.id, texts: [eur(r.costEnd), eur(r.horizonCost), eur(r.blended)] })),
    total: (p, ids) => [eur(D.aggTokens(p, ids).totals.horizonCost)] },
  { id: 'knowledge', title: /Knowledge hub/, caption: 'Knowledge hub subset by product', input: true, spread: 'Spread of the hub levels',
    rows: (p, ids) => D.aggKnowledge(p, ids).rows.map((r) =>
      ({ id: r.id, texts: [`CC${r.asisCC} → CC${r.targetCC}`, fmtEurK(r.setup), r.asisScore.toFixed(0), r.curationFTE.toFixed(2)] })),
    total: (p, ids) => { const t = D.aggKnowledge(p, ids).totals; return [fmtEurK(t.setup), fmtEurK(t.annual)]; } },
  { id: 'run-sizing', title: /Agentic run-team sizing/, caption: 'Run-team sizing by product', input: true, spread: 'Spread of the sizing inputs',
    rows: (p, ids) => D.aggRunSizing(p, ids).rows.map((r) => ({ id: r.id, texts: [fix(r.floorMin, 1), fix(r.runFte, 2), eur(r.runCost)] })),
    total: (p, ids) => { const t = D.aggRunSizing(p, ids).totals; return [fix(t.runFte, 2), eur(t.runCost)]; } },
  { id: 'opmodel', title: /Operating model/, caption: 'Team topology by product', input: false,
    drill: (id, p) => { const r = D.aggOpModel(p, [id]).rows[0]!; return `the residual is ${r.yN.residual.toFixed(1)} FTE across ${r.yN.pods} pod`; },
    rows: (p, ids) => D.aggOpModel(p, ids).rows.map((r) => ({ id: r.id, texts: [fix(r.y1.residual, 1), fix(r.yN.total, 1), r.ok ? '✓ holds' : '✗ fails'] })),
    total: (p, ids) => { const t = D.aggOpModel(p, ids).totals; return [fix(t.y1.total, 1), `${t.ok} of ${ids.length} hold`]; } },
  { id: 'setup', title: /Agentic Setup/, caption: 'Setup lines by product', input: true, spread: 'Spread of the setup inputs',
    rows: (p, ids) => D.aggSetup(p, ids).rows.map((r) => ({ id: r.id, texts: [eurK(r.tooling), eurK(r.total)] })),
    total: (p, ids) => { const t = D.aggSetup(p, ids).totals; return [eurK(t.tooling), eurK(t.total)]; } },
  { id: 'eligibility', title: /Eligibility & Abaques/, caption: 'Eligibility gate by product', input: false,
    drill: (id, p) => (D.aggEligibility(p, [id]).rows[0]!.verdict === 'no-go' ? 'NO-GO' : 'GO'),
    rows: (p, ids) => D.aggEligibility(p, ids).rows.map((r) => ({ id: r.id, texts: [U(r.verdict), `${(r.vTaxRate * 100).toFixed(1)}%`, `L${r.level}`] })),
    total: (p, ids) => { const t = D.aggEligibility(p, ids).totals; return [`${t.go} go · ${t.conditional} conditional · ${t.noGo} blocked`]; } },
  { id: 'maturity', title: /Maturity & Measurement/, caption: 'Maturity and coaching by product', input: true, spread: 'Spread of the maturity inputs',
    rows: (p, ids) => D.aggMaturity(p, ids).rows.map((r) => ({ id: r.id, texts: [r.sddName, r.sdd.toFixed(0), eurK(r.coachCostY1)] })),
    total: (p, ids) => [eurK(D.aggMaturity(p, ids).totals.coachCostY1)] },
  { id: 'program', title: /Program & Completeness/, caption: 'Programme inputs by product', input: true, spread: 'Spread of the programme inputs',
    rows: (p, ids) => D.aggProgram(p, ids).rows.map((r) => ({ id: r.id, texts: [r.pilotFte.toFixed(1), eurK(r.pilotCost), `${r.capPct}%`] })),
    total: (p, ids) => { const t = D.aggProgram(p, ids).totals; return [t.pilotFte.toFixed(1), eurK(t.pilotCost)]; } },
  { id: 'risk', title: /Risk & Compliance/, caption: 'Risk inputs by product', input: true, spread: 'Spread of the risk inputs',
    rows: (p, ids) => D.aggRisk(p, ids).rows.map((r) => ({ id: r.id, texts: [r.tierLabel, r.score.toFixed(2), r.band, (r.diBar * 100).toFixed(1)] })) },
];
