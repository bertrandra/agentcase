import type { BeforeAfter } from '@/domain/portfolio';
import { DataTable } from '@/ui/widgets/DataTable';
import { fmtCell } from './fmtCell';

/** Before / after lines of the selection as the domain computed them (AS-IS, TO-BE and the relative change); a blank cell is a figure that does not exist. */
export function BeforeAfterTable({ rows, caption, asis = 'AS-IS', tobe = 'TO-BE' }: { rows: BeforeAfter[]; caption: string; asis?: string; tobe?: string }) {
  const pct = (r: BeforeAfter) => (r.change === null ? '—' : `${r.change > 0 ? '+' : ''}${Math.round(r.change)}${r.kind === 'pct' ? 'pp' : '%'}`);
  return (
    <DataTable caption={caption} rows={rows} rowKey={(r) => r.metric} columns={[
      { key: 'm', header: 'Metric', render: (r) => <strong title={r.title}>{r.metric}</strong> },
      { key: 'a', header: asis, align: 'center', render: (r) => fmtCell(r.asis, r.kind) || '—' },
      { key: 't', header: tobe, align: 'center', render: (r) => <span style={{ fontWeight: 'var(--ac-font-weight-semibold)', color: 'var(--ac-blue)' }}>{fmtCell(r.tobe, r.kind) || '—'}</span> },
      { key: 'c', header: 'Change', align: 'center', render: pct },
    ]} />
  );
}
