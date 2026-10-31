import { exportMspdi, exportPlanReport, exportPlanWorkbook } from '@/controllers/planExport';
import type { PlanViews } from '@/domain/programme/planBundle';
import { toast } from '@/ui/uiState';
import { downloadBlob, downloadText } from '../../../refshare/download';
import './plan.css';

/**
 * The exports of the Plan screen (docs/SPEC_BPMN.md § 19.8 F-B77, D-B36; phase B9d): MS Project XML (MSPDI: opens in MS Project and
 * ProjectLibre, imports into Primavera; export only), the results workbook with the plan sheets, and the plan report. Each says it is a derived
 * view of the programme, not a standard conversion.
 */
export function PlanExports({ v }: { v: PlanViews }) {
  const xml = () => { const f = exportMspdi(v); downloadText(f.filename, f.text, 'application/xml'); toast('MS Project XML exported'); };
  const html = () => { const f = exportPlanReport(v); downloadText(f.filename, f.text, 'text/html'); toast('Plan report exported'); };
  const xlsx = () => {
    void exportPlanWorkbook(v).then((f) => { downloadBlob(f.filename, f.blob); toast('Results workbook with the plan sheets exported'); },
      () => toast('The workbook could not be built'));
  };
  return (
    <div className="ac-plan-tools" role="group" aria-label="Plan exports">
      <button type="button" onClick={xml}>⬇ MS Project XML</button>
      <button type="button" onClick={xlsx}>⬇ Results workbook with the plan sheets</button>
      <button type="button" onClick={html}>⬇ Plan report</button>
      <span className="ac-muted">Derived views of the programme process (a documented mapping, not a standard conversion).</span>
    </div>
  );
}
