import { useMemo } from 'react';
import { complianceView } from '@/domain/verifyB';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { complianceChart } from '../vbCharts';
import { MetricCards, useView } from '../vbShared';
import { tok } from '@/domain/theme';

type Sector = ReturnType<typeof complianceView>['sectors'][number];

/** Regulatory compliance: glass ceiling and regulatory artefacts of the selected industry, against every sector. */
export default function ComplianceSection() {
  const v = useView(complianceView), cfg = useMemo(() => complianceChart(v), [v]);
  const hl = (s: Sector) => (s.selected ? { fontWeight: 'var(--ac-font-weight-semibold)', background: `var(--ac-surface-alt, ${tok('primary-60')})` } : undefined);
  return (
    <SectionFrame title="Regulatory compliance"
      help={<p>Glass ceiling and regulatory artifacts by selected industry (with a "None" option). Contextual to industry + reference.</p>}
      result={<>
        <p className="ac-muted">Glass ceiling and regulatory artifacts by selected industry (with a "None" option). Contextual to industry + reference.</p>
        <MetricCards cards={v.cards.map(([l, val, sub]) => [l.toUpperCase(), val, sub])} />
        <ChartPanel config={cfg} label="Max automatable and glass ceiling by sector" height={280} />
        <DataTable rows={v.sectors} rowKey={(s) => s.code} columns={[
          { key: 'n', header: 'Sector', render: (s) => <span style={hl(s)}>{s.name}{s.selected ? ' ◄' : ''}</span> },
          { key: 'st', header: 'Standards', render: (s) => <small>{s.norms}</small> },
          { key: 'g', header: 'Glass ceiling', align: 'center', render: (s) => `${s.ceiling}%` },
          { key: 'm', header: 'Max automatable', align: 'center', render: (s) => `${s.max}%` },
          { key: 'r', header: 'Reg. artifacts', align: 'center', render: (s) => String(s.reg) },
        ]} />
      </>} />
  );
}
