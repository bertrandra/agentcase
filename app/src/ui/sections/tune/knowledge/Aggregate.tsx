import type { KnowledgeAggRow } from '@/domain/portfolio';
import { useKnowledgeAgg } from '@/store/selectionHooksTune';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { fmtEurK } from '@/ui/format';
import { InputAggregate, SpreadTable, type SpreadItem } from '../AggregateShared';

const R = 'right' as const;
const COLS: AggColumn<KnowledgeAggRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave },
  { key: 'on', header: 'Hub', render: (r) => (r.locked ? 'locked' : r.usesHub ? (r.ownFields ? 'own subset' : 'common') : 'off') },
  { key: 'score', header: 'Answers score', align: R, title: 'AS-IS maturity answers, 0–100', render: (r) => r.asisScore.toFixed(0) },
  { key: 'cc', header: 'CC AS-IS → target', align: R, render: (r) => `CC${r.asisCC} → CC${r.targetCC}${r.capped ? ' (capped)' : ''}` },
  { key: 'cur', header: 'Curation FTE', align: R, render: (r) => r.curationFTE.toFixed(2) },
  { key: 'base', header: 'Setup base', align: R, render: (r) => fmtEurK(r.setupBase) },
  { key: 'setup', header: 'Setup cost', align: R, render: (r) => fmtEurK(r.setup) },
  { key: 'annual', header: 'Yearly cost', align: R, title: 'Curation + infrastructure share', render: (r) => fmtEurK(r.annual) },
  { key: 'dom', header: 'Domains', render: (r) => (r.domains.length ? r.domains.map((d) => `${d.label} ${d.weightPct}%`).join(', ') : '—') },
  { key: 'lead', header: 'KT lead (months)', align: R, render: (r) => r.lead },
];

/** Knowledge hub — Aggregate view: the hub subset of each product (reuses the Knowledge-transfer table lines) and the domain's totals (read-only). */
export default function KnowledgeAggregate() {
  const a = useKnowledgeAgg(), vs = useViewScope(), t = a.totals;
  const items: SpreadItem[] = [
    { id: 'tcc', name: 'Target CC (products using the hub)', s: a.target, f: (v) => `CC${v.toFixed(1)}` },
    { id: 'acc', name: 'AS-IS CC', s: a.asis, f: (v) => `CC${v.toFixed(1)}` },
  ];
  return (
    <InputAggregate title="🧠 Knowledge hub — living memory"
      intro="the hub is shared by the portfolio and each product holds its own subset (activation, answers, target, curation, setup base, domains, KT lead).">
      <AggregateTable caption={`Knowledge hub subset by product — ${vs.label}`} rows={a.rows} columns={COLS}
        totals={{ label: `Total — ${vs.label}`, cells: { setup: fmtEurK(t.setup), annual: fmtEurK(t.annual) } }} />
      <p className="ac-muted">{a.users} of {a.rows.length} product(s) run the hub. Effects and the per-wave table are in Knowledge transfer.</p>
      <SpreadTable caption={`Spread of the hub levels — ${vs.label}`} items={items} />
    </InputAggregate>
  );
}
