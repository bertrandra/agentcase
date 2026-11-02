import { useId, useState } from 'react';
import { interviewsOf } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';

/** The auditor filter shared by the run and progress tabs: "I am (auditor)", the audit activities of that auditor (all when none is picked). */
export function useAuditor(data: AuditViewData) {
  const [auditor, setAuditor] = useState(''), all = data.audit.header?.interviews ?? [];
  return { auditor, setAuditor, all, mine: interviewsOf(all, auditor) };
}
export function AuditorPick({ data, f, onPick }: { data: AuditViewData; f: ReturnType<typeof useAuditor>; onPick?: () => void }) {
  const id = useId(), n = f.mine.length;
  return (
    <div className="ac-form-row">
      <label htmlFor={`${id}-me`}>I am (auditor)</label>
      <select id={`${id}-me`} value={f.auditor} onChange={(e) => { f.setAuditor(e.target.value); onPick?.(); }}>
        <option value="">Every auditor</option>
        {(data.audit.header?.auditors ?? []).map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
      </select>
      <span className="ac-muted">{`${n} audit activit${n === 1 ? 'y' : 'ies'}${f.auditor ? ` for ${f.auditor}` : ''}`}</span>
    </div>
  );
}

