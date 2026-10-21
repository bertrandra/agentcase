import { SectionFrame } from '@/ui/zones/SectionFrame';
import { DdTable } from './DdTable';
import { Summary } from './Summary';
import { useDd } from './useDd';

const help = (
  <>
    <p>A register of what must be confirmed with the client for the model to be defensible, including the coefficients that were hardcoded in the calculation path. Surfacing a coefficient is not a criticism of the model — every model has coefficients; the defect was that they were unseeable.</p>
    <p>PC1 client-provided · PC2 client-observable · PC3 catalogue default · PC4 unvalidated estimate · PC5 embedded coefficient. The € weight is measured, never asserted: several coefficients turn out to have no euro path at all.</p>
  </>
);

/** Due diligence — the coefficient and assumption register to confirm with the client. */
export default function DueDiligenceSection() {
  const m = useDd();
  return <SectionFrame title="🧾 Due diligence" help={help} input={<Summary m={m} />} result={<DdTable m={m} />} />;
}
