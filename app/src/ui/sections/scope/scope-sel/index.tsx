import { SectionFrame } from '@/ui/zones/SectionFrame';
import { AdjustTable } from './AdjustTable';
import { CeilingImpact } from './CeilingImpact';
import { PhaseList } from './PhaseList';
import { ScopeToolbar } from './ScopeToolbar';

const OVERRIDES = ['BPMN'] as const;

const help = (
  <>
    <p>Select the individual artifacts (grouped by phase) included in the scenario. Tick a phase header to toggle all its artifacts, or pick a few target
      artifacts. The input team is treated as dedicated to the selected scope, so automation depth is driven by the selected artifacts’ automatable average (the
      target automation potential auto-fits to it).</p>
    <p>Selection cascades across every tab — team reduction, costs, vFTE, ROI, KPI, compliance and performance.</p>
  </>
);

/** Scope — target artifact selection: choose the scope, adjust per-artefact automation and see what holds the potential back. */
export default function ScopeSelSection() {
  return (
    <SectionFrame title="Scope — target artifact selection" help={help} overrides={OVERRIDES}
      input={<><ScopeToolbar /><PhaseList /><AdjustTable /></>} result={<CeilingImpact />} />
  );
}
