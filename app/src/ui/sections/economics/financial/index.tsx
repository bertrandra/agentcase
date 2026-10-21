import { SectionFrame } from '@/ui/zones/SectionFrame';
import { useEconomics } from '../useEconomics';
import { ResultsExcelPanel } from '../../refshare/io/ResultsExcelPanel';
import { Decomp } from './Decomp';
import { FteShift } from './FteShift';
import { Invest } from './Invest';
import { OpCost } from './OpCost';
import { Pl } from './Pl';
import { Savings } from './Savings';
import { Verdict } from './Verdict';

const help = (
  <>
    <p>The consolidated money view. Every lever set elsewhere arrives here as the four numbers a sponsor decides on: ROI, payback, NPV and cash-flow shape. Nothing new is modelled: it aggregates and discounts the Time Engine.</p>
    <p>ROI (net) = (Σ savings − setup) ÷ setup. Payback = first month where the cumulative cash-flow is ≥ 0. NPV discounts the monthly cash-flow at the case discount rate. All span the selected horizon.</p>
    <p>Year 1 is typically small or negative (the J-curve): the ramp is low while the run team, infrastructure and tokens are paid in full on top of the one-off setup.</p>
  </>
);

/** Financial summary — ROI & verdict, investment, operating cost, savings, P&L and the workforce shift, all from one model. */
export default function FinancialSection() {
  const v = useEconomics();
  return (
    <SectionFrame title={`Financial Summary — ${v.H}-year case`} help={help}
      result={<><p className="ac-muted">The complete money view: verdict (ROI, payback, NPV), setup, operating costs, savings, cash-flow, the human/agent cost shift and unit economics — all from one model.</p>
        <Verdict /><Invest /><OpCost /><Savings /><Decomp /><Pl /><FteShift /><ResultsExcelPanel /></>} />
  );
}
