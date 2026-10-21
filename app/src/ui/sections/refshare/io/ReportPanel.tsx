import { useState } from 'react';
import { criticalReport } from '@/controllers/report';
import { Callout, Panel } from '@/ui/widgets/cards';
import { downloadText } from '../download';

/** Critical & Regulated Software Delivery report: a standalone HTML page (norms, supervision postures, authority cap, economics). */
export function ReportPanel() {
  const [status, setStatus] = useState(''), [failed, setFailed] = useState(false);
  const run = () => {
    const r = criticalReport();
    if (!r.ok) { setStatus(r.reason); setFailed(true); return; }
    downloadText(r.filename, r.html, 'text/html');
    setStatus(`Report generated (${r.norms} norms, ${r.artefacts} regulatory artifacts).`); setFailed(false);
  };
  return (
    <Panel title="📄 Critical & Regulated Software Delivery report">
      <p>Standalone HTML report of the current case: selected norms, glass-ceiling arithmetic, supervision floors and postures by phase, the AI authority cap of the engagement context and the economics of compliance. Needs the Regulatory catalog on and at least one norm selected.</p>
      <button type="button" className="ac-btn" onClick={run}>📄 Export critical-delivery report</button>
      <div role="status" aria-live="polite" style={{ marginTop: 8 }}>{status && <Callout kind={failed ? 'warn' : 'note'}>{status}</Callout>}</div>
    </Panel>
  );
}
