import { MC_PARAMS_DEFAULT, mcParamsOf } from '@/domain/stress';
import { setMcSpread } from '@/controllers/stress';
import { useCtx } from '@/store/hooks';
import { DataTable } from '@/ui/widgets/DataTable';

/** The uncertain parameters: current value and the editable ± spread (amber = edited vs the default benchmark). */
export function ParamTable() {
  const c = useCtx(), rows = mcParamsOf(c.s);
  return (
    <DataTable rows={rows} rowKey={(p) => p.id} columns={[
      { key: 'l', header: 'Uncertain parameter', render: (p) => p.label },
      { key: 'c', header: 'Current', align: 'center', render: (p) => { const v = parseFloat(c.inp.v(p.id)); return <span className="ac-muted">{isNaN(v) ? '—' : v}</span>; } },
      { key: 's', header: 'Uncertainty (±)', align: 'center', render: (p) => {
        const def = MC_PARAMS_DEFAULT.find((x) => x.id === p.id), edited = !!def && Math.abs(p.spread - def.spread) > 0.001;
        return <>±<input type="number" min={0} step={1} aria-label={`Spread of ${p.label}`} value={p.spread} onChange={(e) => setMcSpread(p.id, e.target.value)}
          style={{ width: 56, textAlign: 'center', borderColor: edited ? 'var(--ac-amber)' : undefined }} /> {p.mode === 'pct' ? '%' : 'pts'}</>; } },
    ]} />
  );
}
