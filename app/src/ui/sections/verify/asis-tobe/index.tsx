import { asisTobeView } from '@/domain/verifyB';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CompareTable, useView } from '../vbShared';

/** AS-IS vs TO-BE: the same workload run manually and agentically, contextual to the automation potential. */
export default function AsisTobeSection() {
  const v = useView(asisTobeView);
  const intro = `Comparison of the same workload run manually (AS-IS) vs agentic (TO-BE ${v.endL}). Metrics contextual to the automation potential.`;
  return (
    <SectionFrame title="AS-IS vs TO-BE" help={<p>{intro}</p>}
      result={<><p className="ac-muted">{intro}</p><CompareTable head={['Metric', 'AS-IS', `TO-BE ${v.endL}`, 'Difference']} rows={v.rows} /></>} />
  );
}
