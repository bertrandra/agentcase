import type { ReactNode } from 'react';
import type { ElementAudit } from '@/domain/audit';

/** True when an element's audit holds a tool, an observation, a pain point or evidence. */
export const isAudited = (a: ElementAudit | undefined): boolean => !!a && a.observations.length + a.tools.length + a.painPoints.length + a.evidence.length > 0;

/** The scrollable table of the elements an audit tab lists (roles, programme activities): its header row, then the rows. */
export function AuditTable({ labelledBy, head, children }: { labelledBy: string; head: string[]; children: ReactNode }) {
  return (
    <div className="ac-table-wrap" tabIndex={0}>
      <table className="ac-table" aria-labelledby={labelledBy}>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
