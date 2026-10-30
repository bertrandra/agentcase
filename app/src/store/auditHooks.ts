/** @calc-zone process-model */
import { useMemo } from 'react';
import { activityAudits, effectiveCatalog, readAudit, type ActivityAudit, type AuditModel, type CatalogTool } from '@/domain/audit';
import { readProcess, type ActorView, type XDocument } from '@/domain/process';
import { useDoc } from './hooks';

/** What the 🔎 Audit section reads (docs/SPEC_BPMN.md § 15): the shown case's document, its audit, the activities and the catalogue. */
export interface AuditViewData { doc: XDocument; audit: AuditModel; rows: ActivityAudit[]; catalog: CatalogTool[]; actors: ActorView[] }

/** The audit of the shown case, recomputed only when its process document changes identity. */
export function useAuditData(): AuditViewData {
  const doc = useDoc((d) => d.BPMN);
  return useMemo(() => {
    const audit = readAudit(doc);
    return { doc, audit, rows: activityAudits(doc), catalog: effectiveCatalog(audit), actors: readProcess(doc).actors };
  }, [doc]);
}
