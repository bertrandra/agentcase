import { useEffect, useRef } from 'react';
import type { AuditViewData } from '@/store/auditHooks';
import { Activities } from './Activities';
import { InterviewRun } from './AuditActivities';
import { ElementForm } from './ElementForm';
import { useAuditView } from './view';

/**
 * 🔎 Audit › Audit run / interview › Audit activity (owner's request 2026-11-03): the interview and the activities in one tab. The auditor picks
 * their audit activities and sees the interview's context, whose activities open their audit form; every in-scope activity stays reachable
 * below (progress per phase, filters). One form, under both lists, for the activity selected in either; selecting one brings it into view.
 */
export function AuditActivityTab({ data }: { data: AuditViewData }) {
  const selected = useAuditView((s) => s.selected), sel = data.rows.find((r) => r.id === selected), form = useRef<HTMLDivElement>(null);
  const selId = sel?.id;
  useEffect(() => { if (selId) form.current?.scrollIntoView?.({ block: 'start' }); }, [selId]);   // on a new selection only
  return (
    <>
      <InterviewRun data={data} />
      <details className="ac-audit-all" open>
        <summary>All in-scope activities: progress per phase, filters</summary>
        <Activities data={data} withForm={false} />
      </details>
      <div ref={form}>{sel && <ElementForm data={data} id={sel.id} title={`${sel.id} · ${sel.name}`} capability={sel.capability} />}</div>
    </>
  );
}
