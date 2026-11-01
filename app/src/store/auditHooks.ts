/** @calc-zone process-model */
import { useMemo } from 'react';
import { activityAudits, effectiveCatalog, productAuditOf, readAudit, withElementAudits, type ActivityAudit, type AuditModel, type CatalogTool,
} from '@/domain/audit';
import { orgExtOf } from '@/domain/org';
import { productAuditTarget } from './commonEdit';
import { appStore } from './instance';
import { readProcess, type ActorView, type XDocument } from '@/domain/process';
import { useDoc, usePortfolio } from './hooks';

/** What the 🔎 Audit section reads (docs/SPEC_BPMN.md § 15): the shown case's document, its audit, the activities and the catalogue. */
export interface AuditViewData { doc: XDocument; audit: AuditModel; rows: ActivityAudit[]; catalog: CatalogTool[]; actors: ActorView[] }

/** The audit of the shown case, recomputed only when its process document changes identity. */
export function useAuditData(): AuditViewData {
  const base = useDoc((d) => d.BPMN), product = usePortfolio(productAuditTarget), part = usePortfolio((p) => orgExtOf(p.common.BPMN as XDocument));
  return useMemo(() => {
    // FX-D6: a product sharing the common process sees (and edits) its own audit, laid over the document's
    const doc = product ? withElementAudits(base, productAuditOf(appStore().getState().portfolio.common.BPMN as XDocument, product)) : base;
    const audit = readAudit(doc);
    return { doc, audit, rows: activityAudits(doc), catalog: effectiveCatalog(audit), actors: readProcess(doc).actors };
  }, [base, product, part]);   // eslint-disable-line react-hooks/exhaustive-deps -- `part` is the identity of the organisation part
}
