import { useState } from 'react';
import { exportResultsWorkbook, type SheetImages } from '@/controllers/excelResults';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { ResultsNote } from './PortfolioNotes';

/** Chart canvas (by its accessible name) that illustrates each sheet, as the legacy export did with its own charts. */
const CHARTS: [keyof SheetImages, string][] = [
  ['ROI', 'Cumulative cash-flow by month'], ['Operating costs', 'Operating cost mix of the end year'], ['Savings', 'Savings per year'],
  ['P&L', 'Cumulative cash-flow after setup and each year'], ['Workforce shift', 'Human FTE and agent vFTE over the horizon'],
];

/** Pictures of the Financial charts that are mounted right now. A chart that is not on screen simply has no picture in the workbook. */
function captureCharts(): SheetImages {
  const out: SheetImages = {};
  for (const [key, label] of CHARTS) {
    try {
      const cv = Array.from(document.querySelectorAll('canvas')).find((c) => c.getAttribute('aria-label') === label);
      const url = cv?.toDataURL?.('image/png');
      if (url && url.includes(',')) out[key] = url.slice(url.indexOf(',') + 1);
    } catch { /* a canvas that cannot be read is left out */ }
  }
  return out;
}

/** Export of the results workbook (ROI, Investment, Operating costs, Savings, P&L, Workforce shift) — the legacy "Export financial to Excel". */
export function ResultsExcelPanel() {
  const [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const images = captureCharts(), { blob, filename } = await exportResultsWorkbook(images), url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: filename }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      const pictures = Object.keys(images).length;
      setStatus(`Saved ${filename}${pictures ? '' : ' (no chart pictures: open the Financial Summary first to include them)'}`);
      toast(`Saved ${filename}`);
    } catch (e) { setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}`); } finally { setBusy(false); }
  };
  return (
    <Panel title="📊 Results workbook (Excel)">
      <p>One sheet per section of the Financial Summary — ROI, Investment, Operating costs, Savings, P&amp;L and Workforce shift — with the figures of the current case, rounded as on screen.</p>
      <ResultsNote />
      <button type="button" className="ac-btn ac-btn-primary" disabled={busy} onClick={() => void run()}>⬇️ Export financial to Excel (one sheet per section)</button>
      <div role="status" aria-live="polite" style={{ marginTop: 8 }}>{status && <Callout>{status}</Callout>}</div>
    </Panel>
  );
}
