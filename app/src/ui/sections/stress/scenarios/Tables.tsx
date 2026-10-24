import { textColor } from '@/ui/colorText';
import { fmtE, fmtPayback, fmtSigned, paybackShown, roiText, type Scenario } from '@/domain/stress';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { useTheme } from '@/ui/themeContext';

/** The scenario's name in its colour, corrected as text on the table background (a resolved hex: `textColor`). */
function Name({ s }: { s: Scenario }) {
  const { tok } = useTheme();
  return <strong style={{ color: textColor(tok(s.tone), tok, tok('slate-60')) }}>{s.label}</strong>;
}
const money = (v: number) => fmtE(v);

/** Annual run cost by scenario: baseline, each year of the horizon, the horizon total and the saving vs AS-IS. */
export function CostTable({ S }: { S: Scenario[] }) {
  const m0 = (S[0] as Scenario).m, H = m0.yearRun.length;
  const cols: Column<Scenario>[] = [
    { key: 'name', header: 'Scenario', render: (s) => <Name s={s} /> },
    { key: 'base', header: 'Baseline (AS-IS)', align: 'right', render: (s) => money(s.m.baselineRun) },
    ...Array.from({ length: H }, (_, i): Column<Scenario> => ({ key: `y${i}`, header: `Year ${i + 1} (€)`, align: 'right', render: (s) => money(s.m.yearRun[i] as number) })),
    { key: 'run', header: `${H}-yr run (€)`, align: 'right', render: (s) => money(s.m.yearRun.reduce((a, b) => a + b, 0)) },
    { key: 'sav', header: `${H}-yr savings (€)`, align: 'right',
      render: (s) => (s.key === 'asis' ? <span className="ac-muted">—</span> : <span style={{ color: s.m.totBen >= 0 ? 'var(--ac-teal)' : 'var(--ac-brick)', fontWeight: 'var(--ac-font-weight-semibold)' }}>{fmtSigned(s.m.totBen)}</span>) },
  ];
  return <DataTable columns={cols} rows={S} rowKey={(s) => s.key} caption="Annual run cost by scenario" />;
}

/** ROI trajectory: setup, savings, net, ROI, payback and cumulative cash-flow at the horizon end. */
export function RoiTable({ S }: { S: Scenario[] }) {
  const rows = S.filter((s) => s.key !== 'asis'), H = (S[0] as Scenario).m.yearRun.length;
  const net = (s: Scenario) => s.m.totBen - s.m.setup;
  const cols: Column<Scenario>[] = [
    { key: 'name', header: 'Scenario', render: (s) => <Name s={s} /> },
    { key: 'setup', header: 'Setup (€)', align: 'right', render: (s) => money(s.m.setup) },
    { key: 'sav', header: `${H}-yr savings (€)`, align: 'right', render: (s) => money(s.m.totBen) },
    { key: 'net', header: 'Net (€)', align: 'right', render: (s) => fmtSigned(net(s)) },
    { key: 'roi', header: 'ROI (net)', align: 'right', render: (s) => <b style={{ color: (s.m.roi ?? 0) >= 0 ? 'var(--ac-teal)' : 'var(--ac-brick)' }}>{roiText(s.m)}</b> },
    { key: 'pb', header: 'Payback', align: 'right', render: (s) => fmtPayback(paybackShown(s.m), s.m.horizon * 12) },
    { key: 'cum', header: `Cum. cash-flow Y${H} (€)`, align: 'right', render: (s) => fmtSigned(net(s)) },
  ];
  return <DataTable columns={cols} rows={rows} rowKey={(s) => s.key} caption="ROI trajectory by scenario" />;
}
