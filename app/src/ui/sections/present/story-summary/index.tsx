import { useMemo } from 'react';
import { storySummary } from '@/domain/pdc/story';
import { fmtPayback, fmtPaybackMonths } from '@/domain/economics';
import { useCtx } from '@/store/hooks';
import { fmtK } from '@/ui/economicsFormat';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';

const help = (
  <p>The guided sequence’s own close: one page, baseline vs target, across team, cost, delivery and confidence. Distinct from the detailed AS-IS vs TO-BE
    comparison tab — this is the narrative summary, not the row-by-row breakdown (Story Mode, SM-SPEC v0.1 §10 Q4).</p>
);

/** The story so far — AS-IS to TO-BE on one page. */
export default function StorySummarySection() {
  const c = useCtx(), s = useMemo(() => storySummary(c), [c]);
  const payTxt = s.payback == null ? `beyond the ${s.horizon}-year horizon` : fmtPaybackMonths(s.payback, s.horizon * 12);
  const rows: [string, string, string][] = [
    ['Headcount (FTE)', s.baseFte.toFixed(1), s.tgtFte.toFixed(1)],
    ['Run cost / yr', fmtK(s.baselineRun), fmtK(s.endRun)],
    ['Delivery velocity', 'baseline', `+${s.velocityPct}%`],
    [`${s.endLabel} savings`, '—', fmtK(s.endSavings)],
    ['Payback', '—', fmtPayback(s.payback, s.horizon * 12)],
  ];
  return (
    <SectionFrame title="📖 The story so far — AS-IS → TO-BE" help={help}
      result={<>
        <p className="ac-story-lead">This case moves the team
        from <strong>{s.baseFte.toFixed(1)} FTE</strong> to <strong>{s.tgtFte.toFixed(1)} FTE</strong> by {s.endLabel},
        at <strong>+{s.velocityPct}%</strong> delivery velocity, saving <strong>{fmtK(s.endSavings)}</strong> in {s.endLabel} with a payback
        of <strong>{payTxt}</strong>.</p>
        <DataTable rows={rows} rowKey={(r) => r[0]} columns={[
          { key: 'k', header: '', render: (r) => r[0] }, { key: 'a', header: 'AS-IS', align: 'center', render: (r) => r[1] },
          { key: 'b', header: `TO-BE (${s.endLabel})`, align: 'center', render: (r) => <b>{r[2]}</b> }]} />
        <p className="ac-muted">Confidence grading available once the ⚙️ Modelling Engine’s P6 evidence ledger is enabled.</p>
      </>} />
  );
}
